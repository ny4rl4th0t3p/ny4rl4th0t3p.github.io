# ny4rl4th0t3p.github.io

Source for [ny4rl4th0t3p.github.io](https://ny4rl4th0t3p.github.io) — MkDocs (Material) with the built-in blog plugin.

```sh
python3 -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
mkdocs serve            # http://127.0.0.1:8000
mkdocs build --strict   # what CI runs; fails on broken links
```

`docs/index.md` is the landing page; `docs/blog/posts/` holds one entry per filed finding. Pushes to `main` build and
deploy through `.github/workflows/pages.yml`.
