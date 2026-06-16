# Mobile and Matching Plan

This branch starts the move from a mobile-first web prototype to an actual mobile app while keeping
the current Firebase backend.

## Recommendation

Use Expo React Native for the first mobile version. It lets us reuse React knowledge, keep Firebase,
and build Android/iOS screens without rewriting the whole product at once.

For Firebase access, start with the Firebase JS SDK because it supports Authentication, Firestore,
and Storage in Expo. Move to React Native Firebase later only if we need native-only modules.

## Matching Options

| Option | Fit | Notes |
| --- | --- | --- |
| Current metadata score | Now | Uses text, location, image color, and report timing. Good baseline for MVP demos. |
| ML Kit image labels | Next | On-device labels with confidence scores. Good for mobile privacy and speed. |
| ML Kit object detection | Next | Useful when we want to crop the main object before matching. |
| Cloud Vision labels | Later | Strong cloud label detection, but needs backend proxying and may add cost. |
| Custom LiteRT model | Later | Best for campus-specific item categories, but needs dataset and training time. |

Firebase ML itself is not the target because it is deprecated. The safer long-term plan is ML Kit
or a backend image-label provider.

## Matching Score Shape

Reports should eventually store this extra metadata:

```js
{
  searchKeywords: ["black", "wallet", "library"],
  imageSignature: {
    averageColor: { r: 32, g: 29, b: 24 }
  },
  imageLabels: [
    { text: "Wallet", confidence: 0.82 },
    { text: "Fashion accessory", confidence: 0.64 }
  ]
}
```

The app can then compare:

- description text
- location text
- image labels
- average image color
- report time proximity

## Mobile App Screens

```text
AuthScreen
VerifyEmailScreen
FeedScreen
ReportItemScreen
ItemDetailScreen
AccountScreen
```

## First Mobile Milestone

- Create the Expo app shell.
- Reuse the same Firebase project.
- Reuse shared matching helpers.
- Add camera/gallery image selection.
- Submit reports to the same Firestore and Storage collections.
- Show the same match confidence labels used by the web app.
