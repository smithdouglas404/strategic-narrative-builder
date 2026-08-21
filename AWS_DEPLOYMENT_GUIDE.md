# AWS Deployment Guide for Strategic Narrative Builder 2.0

This guide walks through containerizing and deploying your app to AWS using **ECR** (registry) and **ECS** (orchestration).

## Prerequisites

- AWS account with permissions to create ECR, ECS, EC2, and IAM resources
- AWS CLI configured (`aws configure` with your credentials)
- Docker CLI installed locally
- `strategic-narrative:1.0` image already built locally

## Step 1: Create ECR Repository

Replace `YOUR_ACCOUNT_ID` with your actual AWS account ID and choose your region (e.g., `us-east-1`).

```bash
# Set variables
AWS_ACCOUNT_ID="your-account-id-here"
AWS_REGION="us-east-1"
REPO_NAME="strategic-narrative-builder"

# Create ECR repository
aws ecr create-repository \
  --repository-name $REPO_NAME \
  --region $AWS_REGION

# Verify
aws ecr describe-repositories \
  --repository-names $REPO_NAME \
  --region $AWS_REGION
```

**Output:** Note the `repositoryUri` (e.g., `123456789.dkr.ecr.us-east-1.amazonaws.com/strategic-narrative-builder`)

## Step 2: Authenticate Docker to ECR

```bash
# Login to ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com
```

## Step 3: Tag and Push Image to ECR

```bash
# Tag the local image
docker tag strategic-narrative:1.0 \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:1.0

docker tag strategic-narrative:1.0 \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest

# Push to ECR
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:1.0
docker push ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest

# Verify
aws ecr describe-images \
  --repository-name $REPO_NAME \
  --region $AWS_REGION
```

## Step 4: Choose Deployment Option

### **Option A: AWS App Runner (Recommended for Simplicity)**

App Runner is the easiest—no cluster management, auto-scaling, and fully managed HTTPS.

```bash
# Create App Runner service
aws apprunner create-service \
  --service-name strategic-narrative-builder \
  --source-configuration \
    "ImageRepository={ImageIdentifier=${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest,ImageRepositoryType=ECR,ImageConfiguration={Port=8787,RuntimeEnvironmentVariables=[{Name=PORT,Value=8787},{Name=HOST,Value=0.0.0.0},{Name=SNB_MAGIC_LINK_DEV_MODE,Value=0}]}}" \
  --instance-configuration \
    "InstanceRoleArn=arn:aws:iam::${AWS_ACCOUNT_ID}:role/AppRunnerECRAccessRole" \
  --region $AWS_REGION
```

**Note:** You'll need to create an IAM role `AppRunnerECRAccessRole` with ECR pull permissions.

#### Create IAM Role for App Runner:

```bash
# Create trust policy
cat > /tmp/trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "tasks.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role
aws iam create-role \
  --role-name AppRunnerECRAccessRole \
  --assume-role-policy-document file:///tmp/trust-policy.json

# Attach ECR pull policy
aws iam attach-role-policy \
  --role-name AppRunnerECRAccessRole \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
```

### **Option B: ECS on Fargate (Recommended for Production)**

ECS Fargate is serverless—AWS manages EC2 instances automatically.

#### Step 4B.1: Create ECS Cluster

```bash
CLUSTER_NAME="strategic-narrative-cluster"

aws ecs create-cluster \
  --cluster-name $CLUSTER_NAME \
  --capacity-providers FARGATE FARGATE_SPOT \
  --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
  --region $AWS_REGION
```

#### Step 4B.2: Create IAM Role for ECS Task

```bash
# Task execution role (allows ECS to pull image from ECR and push logs to CloudWatch)
cat > /tmp/ecs-trust.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

aws iam create-role \
  --role-name ecsTaskExecutionRole \
  --assume-role-policy-document file:///tmp/ecs-trust.json

aws iam attach-role-policy \
  --role-name ecsTaskExecutionRole \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
```

#### Step 4B.3: Create ECS Task Definition

Save this as `task-definition.json`:

```json
{
  "family": "strategic-narrative-builder",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${REPO_NAME}:latest",
      "portMappings": [
        {
          "containerPort": 8787,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "PORT",
          "value": "8787"
        },
        {
          "name": "HOST",
          "value": "0.0.0.0"
        },
        {
          "name": "SNB_MAGIC_LINK_DEV_MODE",
          "value": "0"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/strategic-narrative-builder",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "essential": true
    }
  ],
  "executionRoleArn": "arn:aws:iam::${AWS_ACCOUNT_ID}:role/ecsTaskExecutionRole"
}
```

Register task definition:

```bash
# Replace variables in JSON
sed -i "s/\${AWS_ACCOUNT_ID}/${AWS_ACCOUNT_ID}/g; s/\${AWS_REGION}/${AWS_REGION}/g; s/\${REPO_NAME}/${REPO_NAME}/g" task-definition.json

# Register
aws ecs register-task-definition \
  --cli-input-json file://task-definition.json \
  --region $AWS_REGION
```

#### Step 4B.4: Create CloudWatch Log Group

```bash
aws logs create-log-group \
  --log-group-name /ecs/strategic-narrative-builder \
  --region $AWS_REGION
```

#### Step 4B.5: Create Load Balancer

```bash
# Create Application Load Balancer
ALB_NAME="snb-alb"
SECURITY_GROUP_ID="sg-xxxxx"  # Replace with your VPC security group
SUBNET_IDS="subnet-xxxxx subnet-yyyyy"  # Replace with your VPC subnets

aws elbv2 create-load-balancer \
  --name $ALB_NAME \
  --subnets $SUBNET_IDS \
  --security-groups $SECURITY_GROUP_ID \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region $AWS_REGION
```

#### Step 4B.6: Create ECS Service

```bash
SERVICE_NAME="strategic-narrative-service"

aws ecs create-service \
  --cluster $CLUSTER_NAME \
  --service-name $SERVICE_NAME \
  --task-definition strategic-narrative-builder:1 \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-xxxxx],securityGroups=[sg-xxxxx],assignPublicIp=ENABLED}" \
  --region $AWS_REGION
```

## Step 5: Verify Deployment

```bash
# Check ECS service status
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --region $AWS_REGION

# Check running tasks
aws ecs list-tasks \
  --cluster $CLUSTER_NAME \
  --region $AWS_REGION

# Get task details
aws ecs describe-tasks \
  --cluster $CLUSTER_NAME \
  --tasks <task-arn-from-above> \
  --region $AWS_REGION
```

## Step 6: Access Your Application

### **If using App Runner:**
```bash
aws apprunner describe-service \
  --service-arn arn:aws:apprunner:${AWS_REGION}:${AWS_ACCOUNT_ID}:service/strategic-narrative-builder/xxxxx \
  --region $AWS_REGION
```

The service URL will be displayed as `ServiceUrl`.

### **If using ECS + ALB:**
```bash
aws elbv2 describe-load-balancers \
  --names $ALB_NAME \
  --region $AWS_REGION
```

Use the `DNSName` to access your app.

## Step 7: Configure Data Persistence (Optional)

For production, persist data in EFS or S3:

### **Option 1: EFS (Persistent Filesystem)**

```bash
# Create EFS
FILE_SYSTEM_ID=$(aws efs create-file-system \
  --availability-zone-name ${AWS_REGION}a \
  --performance-mode generalPurpose \
  --throughput-mode bursting \
  --region $AWS_REGION \
  --query 'FileSystemId' --output text)

# Mount targets (requires VPC subnets)
aws efs create-mount-target \
  --file-system-id $FILE_SYSTEM_ID \
  --subnet-id subnet-xxxxx \
  --security-groups sg-xxxxx
```

Then update task definition to mount EFS at `/app/data` and `/app/storage/uploads`.

### **Option 2: S3 for Uploads**

Modify `server.py` to upload files to S3 instead of local storage using `boto3`.

## Step 8: Cleanup (When Done)

```bash
# Delete ECS service
aws ecs delete-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --force \
  --region $AWS_REGION

# Delete cluster
aws ecs delete-cluster \
  --cluster $CLUSTER_NAME \
  --region $AWS_REGION

# Delete ECR repository
aws ecr delete-repository \
  --repository-name $REPO_NAME \
  --force \
  --region $AWS_REGION
```

## Summary

- **Docker image built locally:** ✓ `strategic-narrative:1.0` (41 MB)
- **ECR repository created:** Ready for image storage
- **Image pushed to ECR:** Available for AWS deployments
- **Two deployment options:**
  - **App Runner:** Simplest, auto-scales, managed HTTPS
  - **ECS Fargate:** More control, better for complex apps
- **Next steps:** Run one of the deployment scripts above to launch on AWS

For questions or issues, check CloudWatch logs in the AWS Console.
