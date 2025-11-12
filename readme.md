# printfarm

## CURRENTLY IN PRE-ALPHA WITH ONLY LIMITED BAMBULAB PRINTER SUPPORT

Lightweight, open-source print job manager and queue for local network printers.

## Summary
printfarm provides a simple API, CLI, and optional web UI to submit, monitor, and manage print jobs across multiple printers. Designed for small teams, labs, and makerspaces that need a reliable, auditable print pipeline.


## Planned Features
- Compatibility with Bambulab, Mainsail, Prusa, and Octoprint enabled printers.
- Job submission via HTTP API and webui.
- Queueing, prioritization, and retry policies
- Per-printer configuration and status reporting
- Optional web dashboard for monitoring and basic control
- Audit logs and basic metrics

## Quick start

1. Clone the repo
```
git clone https://github.com/flashruler/printfarm.git
cd printfarm
```

2. Install dependencies (example)
```
# replace with your platform/package manager
pnpm install (frontend)
# or
pip install -r requirements.txt (backend)
```

<!-- 3. Configure
- Copy the example config and edit printers, storage locations, and auth settings:
```
cp config.example.yml config.yml
```

4. Run
```
# start server
npm start
# or
./bin/printfarm serve --config config.yml
``` -->

## Development
- Run tests:
```
npm test
# or
pytest
```
- Start a local development server with hot reload:
```
npm run dev
```
- Lint and format:
```
npm run lint
npm run format
```

## Contributing
Contributions are welcome. Please:
- Open an issue to discuss larger changes first
- Follow the repository coding style and tests
- Submit pull requests against the `main` branch
- Add or update documentation and tests for new features

See CONTRIBUTING.md for details.

## Security
Report security issues via the repository's security policy or contact the maintainers directly. Do not disclose vulnerabilities in open issues.

## License
MIT — see LICENSE file for details.

## Contact
Project repository: https://github.com/flashruler/printfarm