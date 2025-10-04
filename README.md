
# react-native-places-autocomplete-lite

Lightweight Google Places Autocomplete input for React Native and Expo.
Minimal styling, no native modules, works on iOS and Android.

## Why

Existing Google Places autocomplete libraries for React Native were limited or unreliable across platforms. This package implements the Places Autocomplete API directly with a simple, function-first component that “just works.”

## Features

* ⚡️ Debounced requests with cancellation
* 🧠 Session token per mount for better billing/accuracy
* 🔑 API key via prop or auto-read from Expo/ENV
* 🎛️ Configurable `minChars`, `language`, `types`, `debounceMs`
* 🎨 Theming hooks for easy styling
* 📦 No native modules, Axios under the hood

---

## Installation

```bash
npm i react-native-places-autocomplete-lite
# or
yarn add react-native-places-autocomplete-lite
```

### Prerequisite: enable APIs and get a key

1. In Google Cloud Console, enable:

   * **Places API**
   * (Optional) **Places API Details** fields as needed
2. Create an API key. For mobile apps using the Places Web Service, start with **no HTTP referrer restrictions** during development. Add restrictions later as appropriate.

---

## Quick Start

### Minimal usage

```jsx
import React from 'react';
import { View } from 'react-native';
import { PlacesAutocompleteInput } from 'react-native-places-autocomplete-lite';

export default function AddressPicker() {
  return (
    <View style={{ padding: 16 }}>
      <PlacesAutocompleteInput
        apiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}   // or a literal string
        onPlaceSelect={(place) => {
          // place = { description, address?, location: { lat, lng } }
          console.log('Selected:', place);
        }}
      />
    </View>
  );
}
```

### With selection UI

```jsx
import React, { useState } from 'react';
import { View, Text } from 'react-native';
import { PlacesAutocompleteInput } from 'react-native-places-autocomplete-lite';

export default function AddressPicker() {
  const [selected, setSelected] = useState(null);

  return (
    <View style={{ padding: 16 }}>
      <PlacesAutocompleteInput
        apiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
        onPlaceSelect={(p) => setSelected(p)}
        minChars={2}
        language="en"
        types="geocode"
      />
      {selected && (
        <Text style={{ marginTop: 12 }}>
          {selected.description} ({selected.location.lat}, {selected.location.lng})
        </Text>
      )}
    </View>
  );
}
```

### Styling + input props + error handler

```jsx
<PlacesAutocompleteInput
  apiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY}
  onPlaceSelect={(p) => console.log(p)}
  debounceMs={300}
  inputProps={{ autoCorrect: false, autoCapitalize: 'none', placeholder: 'Search address…' }}
  containerStyle={{ width: '100%' }}
  inputStyle={{ borderColor: '#2563EB' }}
  resultItemStyle={{ backgroundColor: '#fff' }}
  resultTextStyle={{ fontSize: 15 }}
  loaderColor="#2563EB"
  onError={(err) => console.warn('Places error', err?.message)}
/>
```

---

## Expo vs bare React Native

### Expo (auto-read key from config)

Add your key to `app.json` / `app.config.js`:

```json
{
  "expo": {
    "extra": {
      "GOOGLE_PLACES_API_KEY": "YOUR_API_KEY"
    }
  }
}
```

Then you can omit the `apiKey` prop entirely; the component auto-reads from Expo Constants or `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`.

### Bare RN (no Expo)

Pass the key directly, or use your env solution (e.g., react-native-config):

```jsx
<PlacesAutocompleteInput
  apiKey="YOUR_API_KEY"
  onPlaceSelect={(p) => console.log(p)}
/>
```

---

## API

### Component

```ts
type SelectedPlace = {
  description: string;
  address?: string;
  location: { lat: number; lng: number };
};

type Props = {
  onPlaceSelect: (place: SelectedPlace) => void;
  apiKey?: string;
  setOuterRes?: (predictions: any[]) => void;
  minChars?: number;        // default: 2
  language?: string;        // default: 'en'
  types?: string;           // default: 'geocode' (e.g. 'address', 'establishment')
  debounceMs?: number;      // default: 250
  inputProps?: object;      // spread onto TextInput
  containerStyle?: object;
  inputStyle?: object;
  resultItemStyle?: object;
  resultTextStyle?: object;
  loaderColor?: string;     // default: '#2563EB'
  onError?: (err: Error) => void;
};
```

### Props table

| Prop              | Type                    | Default     | Description                                                    |
| ----------------- | ----------------------- | ----------- | -------------------------------------------------------------- |
| `onPlaceSelect`   | `(place) => void`       | required    | Callback with `{ description, address?, location:{lat,lng} }`. |
| `apiKey`          | `string`                | auto        | Overrides auto-read from Expo/ENV.                             |
| `setOuterRes`     | `(predictions) => void` | `undefined` | Receives raw predictions array from Autocomplete API.          |
| `minChars`        | `number`                | `2`         | Minimum input length before fetching.                          |
| `language`        | `string`                | `en`        | Results language.                                              |
| `types`           | `string`                | `geocode`   | Restrict results, e.g. `address`, `establishment`.             |
| `debounceMs`      | `number`                | `250`       | Debounce delay for input changes.                              |
| `inputProps`      | `object`                | `{}`        | Props spread to `TextInput`.                                   |
| `containerStyle`  | `object`                | `{}`        | Wrapper style.                                                 |
| `inputStyle`      | `object`                | `{}`        | Input style.                                                   |
| `resultItemStyle` | `object`                | `{}`        | List item style.                                               |
| `resultTextStyle` | `object`                | `{}`        | List item text style.                                          |
| `loaderColor`     | `string`                | `#2563EB`   | ActivityIndicator color.                                       |
| `onError`         | `(err: Error) => void`  | `undefined` | Error callback for Autocomplete/Details requests.              |

---

## How it works

* Uses Google **Places Autocomplete** + **Place Details** Web Service endpoints.
* Groups user keystrokes with a **session token** per component mount; the same token is used for details calls to improve billing consistency.
* **Debounces** requests and **cancels** in-flight ones on rapid typing/unmount.

---

## Performance tips

* Increase `minChars` or `debounceMs` to reduce API calls.
* Consider narrowing `types` (e.g., `"address"`) for more relevant results.
* Only render results when necessary; keep parent re-renders minimal.

---

## Troubleshooting

**I get `REQUEST_DENIED` or `This API project is not authorized`**

* Ensure **Places API** is enabled for your key.
* Remove API restrictions during initial testing. Add restrictions later.

**Works on Android but not iOS (or vice versa)**

* Double-check where the API key is coming from (prop vs Expo extra vs env). Log it in development.
* On Expo, confirm `expo-constants` is available (it’s optional in this package).

**Too many requests / unexpected billing**

* Increase `debounceMs` and/or `minChars`.
* Keep one component instance active per input, so the session token remains stable.

---

## TypeScript

Basic usage:

```tsx
import React from 'react';
import { PlacesAutocompleteInput } from 'react-native-places-autocomplete-lite';

type SelectedPlace = {
  description: string;
  address?: string;
  location: { lat: number; lng: number };
};

export default function TSExample() {
  const onSelect = (p: SelectedPlace) => {
    // your logic
  };

  return (
    <PlacesAutocompleteInput
      apiKey={process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY as string}
      onPlaceSelect={onSelect}
    />
  );
}
```

---

## Example UX patterns

* **Form integration**: Call `onPlaceSelect` to set your form state and store `description` + coordinates.
* **Map handoff**: After selection, center a map on `location.lat/lng`.
* **Reverse confirmation**: Display `address` from Details as a confirmation line below the input.

---

## FAQ

**Does this use native modules?**
No. It uses Axios to call Google Web Services.

**Can I customize the request?**
Yes—`language`, `types`, and `debounceMs` are exposed. You can fork to add extra fields in the Details request if you need more data.

**Does it support server-side keys or proxying?**
This package calls Google directly from the app. If you require a proxy for secrets/rate limiting, wrap the endpoints in your backend and modify the URLs accordingly.

---

## Contributing

PRs and issues welcome. Please include a clear repro or minimal example.

---

## License

MIT © 2025 Uday Singh

See `LICENSE` for details.

---

## Changelog

* **1.0.0** — Initial release.
