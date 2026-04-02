# n8n-nodes-hacknotice

This is an n8n community node for [HackNotice](https://hacknotice.com/). It lets you fetch third-party, first-party, end-user, and research alerts in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Third Party Alerts**
  - Get Third Party Alerts

- **First Party Alerts**
  - Get Many First Party Alerts

- **End User Alerts**
  - Get End User Alerts

- **Research**
  - Get Phrase Alerts
  - Get Wordpool Alerts

All alert operations support:
- Saved search selection (optional)
- Limit By Time: `Last Day`, `Last Week`, `Last Month`

## Credentials

Use the **HackNotice API** credential.

### API Key
- **API Key** – Your HackNotice API key.
- **API Base URL** – Fixed to `https://extensionapi.hacknotice.com`.

### Email & Password (used to obtain JWT)
- **Email** – Your HackNotice account email.
- **Password** – Your HackNotice account password.

The node automatically signs in to obtain a JWT, then sends both headers on every API request:
- `apikey: <your apiKey>`
- `Authorization: JWT <token>`

API reference: [HackNotice API (Postman)](https://documenter.getpostman.com/view/806684/RWaHzA6C)

## Compatibility

Compatible with n8n@1.60.0 or later

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [HackNotice API documentation](https://documenter.getpostman.com/view/806684/RWaHzA6C)
