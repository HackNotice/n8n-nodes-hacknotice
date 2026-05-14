# n8n-nodes-hacknotice

This is an n8n community node for [HackNotice](https://hacknotice.com/). It exposes the **HackNotice** node so you can call the HackNotice extensions API from workflows: third-party, first-party, and end-user alerts; research alerts; first-party, third-party, and end-user watchlists; and the assessments API family.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/sustainable-use-license/) workflow automation platform.

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community nodes documentation.

## Published surface

| Item | Name in n8n | Notes |
|------|-------------|--------|
| Node | **HackNotice** | Single regular node; pick a **Resource**, then an **Operation**. |
| Credential | **HackNotice API** | Two authentication methods (see [Credentials](#credentials)). |

## Operations

### Alerts and research

- **Third Party Alert** — Get Third Party Alerts  
- **First Party Alert** — Get Many First Party Alerts  
- **End User** — Get End User Alerts  
- **Research** — Get Phrase Alerts; Get Wordpool Alerts  

For the alert resources above, you can optionally select a **saved search**, and use **Limit by Time**: `Last Day`, `Last Week`, `Last Month`.

### Watchlists

- **Third Party Watchlist** — Delete by ID; Get by ID; Get Watchlist Domains; Search Domain; Update by ID  
- **First Party Watchlist** — Create Item; Delete by ID; Get by ID; Get Watchlist Items; Search Item  
- **End User Watchlist** — Add Item to Watchlist; Delete by ID; Get by ID; Get Many; Search for Email  

### Assessments (extension API)

Choose one of these **resources**, then pick an **operation** (each operation’s description in the node shows the HTTP method and path):

- **Assessment** — Get Assessment Invite; Update Assessment Invite; List Assessments (Page); Count Assessments; Create Assessment; Get Assessment; Projection Assessments; Delete Assessment; Update Assessment  
- **Assessment Event** — Invited — List Events (Page); Invited — Create Event; Invited — Get Event; Invited — Delete Event; Invited — Update Event; List Events (Page); Count Events; Create Event; Get Event; Delete Event; Update Event  
- **Assessment Template** — List Templates (Page); List Template Frameworks; Count Templates; Create Template; Get Template; Delete Template; Update Template  
- **Assessment Preference** — Create Preferences; Get Preferences; Delete Preferences; Update Preferences  
- **Assessment Invite** — List Invites (Page); Count Invites; Create Invite; Get Invite; List My Invites; Get Invite by Code; Activate Invite; Delete Invite; Update Invite  
- **Assessment Data File** — List Files (Page); Count Files; Get File Metadata; Update File Metadata; Download File; Delete File  
- **Assessment Data File (Invited)** — Upload File (Invited); List Files (Page, Invited); Count Files (Invited); Get File Metadata (Invited); Download File (Invited); Delete File (Invited)  

Assessment calls use shared fields such as **Document ID**, **Page Number**, **Invite Code**, and **Request Body** (JSON) where the API expects them; invited file upload uses the multipart fields shown in the node.

## Credentials

Use the **HackNotice API** credential. Base URL for API traffic is `https://extensionapi.hacknotice.com`.

### API Key + Email + Password

- **API Key** — Your HackNotice API key (sent as the `apikey` header).  
- **Email** / **Password** — Used once per request flow to obtain a JWT via `POST /auth/sign_in`.  

Successful requests send:

- `apikey: <your API key>`  
- `Authorization: JWT <token>`  

### Integration Key

- **Integration Key** — Per-user integration secret from HackNotice.  

Requests send:

- `X-HackNotice-Integration-Key: <your integration key>`  

No email/password or JWT is used for this method.

API reference: [HackNotice API (Postman)](https://documenter.getpostman.com/view/806684/RWaHzA6C)

## Compatibility

Compatible with n8n@1.60.0 or later.

## MCP and AI agents (separate package)

n8n’s [community node verification rules](https://docs.n8n.io/integrations/creating-nodes/build/reference/verification-guidelines/#node-types) allow only **one** regular node per package. MCP client workflows are therefore shipped as a **separate** npm package: [`n8n-nodes-hacknotice-mcp`](https://www.npmjs.com/package/n8n-nodes-hacknotice-mcp) (repository: [github.com/HackNotice/n8n-nodes-hacknotice-mcp](https://github.com/HackNotice/n8n-nodes-hacknotice-mcp)). Install that package for the MCP-oriented node and credential; its README documents install steps, credential fields, and tool exposure. This repo remains the REST-oriented **HackNotice** node only.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)
* [HackNotice API documentation](https://documenter.getpostman.com/view/806684/RWaHzA6C)
