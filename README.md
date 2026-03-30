# n8n-nodes-hacknotice

This is an n8n community node for [HackNotice](https://hacknotice.com/). It lets you fetch third party alerts in your n8n workflows.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Operations

- **Third Party Alerts**
  - Get all third party alerts (returns the same payload as the [HackNotice API](https://documenter.getpostman.com/view/806684/RWaHzA6C))

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
