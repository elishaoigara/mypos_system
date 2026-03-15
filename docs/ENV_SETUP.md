# Environment Variables Setup

When running this project locally (outside of Manus hosting), you need to create a `.env` file in the project root with the following variables.

## Required Variables

| Variable | Example | Description |
|---|---|---|
| `DATABASE_URL` | `mysql://root:password@localhost:3306/pos_db` | MySQL connection string |
| `JWT_SECRET` | `a1b2c3d4e5...` (32+ chars) | Secret for signing session cookies |

Generate a JWT secret with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Optional Variables (Manus OAuth)

These are auto-injected in Manus hosting. For local development without Manus OAuth, leave them empty and authentication will be bypassed.

| Variable | Description |
|---|---|
| `VITE_APP_ID` | Manus OAuth application ID |
| `OAUTH_SERVER_URL` | Manus OAuth backend base URL |
| `VITE_OAUTH_PORTAL_URL` | Manus login portal URL |
| `OWNER_OPEN_ID` | Owner's Manus Open ID |
| `OWNER_NAME` | Owner's display name |

## Database Connection Examples

**Local MySQL:**
```
DATABASE_URL=mysql://root:password@localhost:3306/pos_db
```

**TiDB Cloud:**
```
DATABASE_URL=mysql://user:pass@gateway.tidbcloud.com:4000/pos_db?ssl=true
```

**PlanetScale:**
```
DATABASE_URL=mysql://user:pass@aws.connect.psdb.cloud/pos_db?ssl={"rejectUnauthorized":true}
```
