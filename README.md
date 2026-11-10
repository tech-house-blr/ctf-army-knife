# A Swiss army Knife for CTFs

This is an all-in-one tool (mainly used for CTFs) that contains:

1. PGP/GPG Decoder
2. Cyberchef
3. Aperisolve
4. Cryptogram Decipherer

built into one web app.

## CyberChef integration

CyberChef uses a pinned upstream source subtree, a community theme, and the
existing Next.js server. See [setup, validation, deployment, and updates](docs/cyberchef.md).
Use Node.js 24. After the initial source import, `npm ci` and `npm run dev` prepare
the full workspace automatically. The Python backend is only needed for tools
that use its API, such as the cryptogram solver.

# Future Scope

- Turn this into a docker container for easy deployment on any machine.
