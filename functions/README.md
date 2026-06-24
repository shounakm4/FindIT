# FindIT Cloud Functions

This folder holds the backend code that runs on Firebase, separate from the web app.

## `labelNewItem`

When a student saves a lost or found report, this function runs automatically:

1. It reads the photo the student uploaded from Cloud Storage.
2. It sends the photo to the Gemini API and asks for short labels (category, colour, brand).
3. It saves those labels back on the report as `imageLabels`.

The matching code in `shared/matching.js` already reads `imageLabels`, so once a report is
labelled it counts towards the match score between lost and found items.

## Setup

Install the function dependencies:

```bash
cd functions
npm install
```

Cloud Functions need the Firebase Blaze (pay-as-you-go) plan because they make an outbound
call to the Gemini API.

Store the Gemini API key as a secret (you only do this once):

```bash
firebase functions:secrets:set GEMINI_API_KEY
```

Get the key from Google AI Studio: https://aistudio.google.com/app/apikey

## Run locally

```bash
npm run serve
```

## Deploy

```bash
npm run deploy
```

## Check logs

```bash
npm run logs
```
