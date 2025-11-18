# printfarm

## CURRENTLY IN PRE-ALPHA
Currently supported printers:
 - A1 & A1 Mini
 - P1P, P1S, X1

## Summary

Lightweight, open-source print job manager and queue for local network printers.

printfarm provides a simple API and web UI to submit, monitor, and manage print jobs across multiple printers. Designed for small teams, labs, and makerspaces that need a reliable, auditable print pipeline.
## Current Features
- Basic compatibility with Bambulab printers.
- Printer farm vitals and error notifications.
- Fastapi backend and webui.

## Planned Features
- Compatibility with Bambulab, Mainsail, Prusa, and Octoprint enabled printers.
- Camera support
- Detailed printer status
- Standalone desktop application
- Linux/MacOS Support
- Queueing, prioritization, and retry policies
- Per-printer configuration and status reporting
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

## Security
Report security issues via the repository's security policy or contact the maintainers directly. Do not disclose vulnerabilities in open issues.

## License
MIT — see LICENSE file for details.

## Contact
Project repository: https://github.com/flashruler/printfarm