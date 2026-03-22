# Contributing to SilkWeb

Thank you for your interest in contributing to SilkWeb. Every contribution strengthens the web.

## How to Contribute

### Reporting Issues

- Use [GitHub Issues](https://github.com/silkweb-protocol/silkweb/issues) for bugs and feature requests
- Search existing issues before creating a new one
- Include reproduction steps for bugs

### Protocol Changes

Protocol changes go through a proposal process:

1. Open a **Discussion** describing the change and its motivation
2. The community reviews and provides feedback
3. If accepted, submit a PR modifying `spec/PROTOCOL.md`
4. Protocol changes require at least one maintainer approval

### Code Contributions

1. Fork the repository
2. Create a feature branch from `main`
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

### Pull Request Guidelines

- Keep PRs focused on a single change
- Write clear commit messages
- Reference related issues in the PR description
- Update documentation if your change affects the API or protocol

### Adapter / Plugin Development

Building an adapter for a new framework? Great. See the protocol spec at `spec/PROTOCOL.md` for the full Agent Card schema and message format. Your adapter should:

- Validate Agent Cards against `schemas/agent-card.json`
- Support at minimum: `agent.register`, `agent.discover`, and `task.request`
- Handle JWT authentication
- Include tests

## Development Setup

```bash
# Clone the repo
git clone https://github.com/silkweb-protocol/silkweb.git
cd silkweb

# Python API (when available)
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md). By participating, you agree to uphold this code.

## License

By contributing, you agree that your contributions will be licensed under the Apache License 2.0.
