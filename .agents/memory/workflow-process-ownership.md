---
name: Workflow process ownership
description: Replit workflow supervision can lose track of a Python server child while it continues holding the web port.
---

Use an `exec`-based workflow command for the main Python web server. If the workflow reports failed but the app still serves, identify and stop only the stale process bound to the workflow port before restarting it.

**Why:** A shell-launched child server can outlive a workflow marked failed, leaving port 5000 occupied. A replacement then fails with an address-in-use error even though the app itself is healthy.

**How to apply:** Confirm the server’s bind address and HTTP response, terminate the stale process on the configured port, then restart the workflow once with `exec env HOST=0.0.0.0 PORT=5000 ... python3 server.py`.