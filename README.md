# twitter-vr

A small experiment in building swipe-based UIs with VR hand tracking.

Built with [react-xr](https://github.com/pmndrs/react-xr) and [react-three-fiber](https://github.com/pmndrs/react-three-fiber), on top of [React](https://github.com/facebook/react) and [three.js](https://github.com/mrdoob/three.js/).

## To run

To run the app locally, you need [Yarn 1](https://classic.yarnpkg.com/lang/en/) and the [Vercel CLI](https://vercel.com/docs/cli) installed. You also need to have a [Twitter API Bearer Token](https://developer.twitter.com/en/docs/authentication/oauth-2-0/bearer-tokens) (so that the app can use the v2 Twitter API) as a Node environment variable (I recommend using the [Vercel CLI](https://vercel.com/docs/cli#commands/env) for that too).

To actually run the app, open two terminals. One will run the web app with `create-react-app` and HTTPS (since WebVR requires HTTPS) and the other will run the server using the Vercel CLI.

### Mac/Linux

First terminal:

```bash
yarn
vercel dev --listen 8000
```

Second terminal:

```bash
cd client
yarn
HTTPS=true yarn start
```

### Powershell

First terminal:

```powershell
yarn
vercel dev --listen 8000
```

Second terminal:

```powershell
cd client
yarn
($env:HTTPS = "true") -and (yarn start)
```
