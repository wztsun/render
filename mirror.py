#!/usr/bin/env python3
"""把 tophub.today 首页抓成本地静态站（含同源 css/js/图片），输出到 OUT。

并发 + 短超时，几秒到几十秒跑完。已存在的文件跳过，可重复执行。
外链 <a href> 保留指向线上，不做站内镜像。
"""
import os, re, sys, hashlib, urllib.request, urllib.parse, posixpath
from concurrent.futures import ThreadPoolExecutor

BASE = "https://tophub.today/"
OUT = sys.argv[1] if len(sys.argv) > 1 else "/data/tophub"
TIMEOUT = 8
WORKERS = 16
# 站点自己的 app.js 会检查 hostname，不在白名单里就跳回 tophub.today；这里补上我们的域名并去掉硬跳转。
PUB_HOST = "8080-agq5rnz5hitjeklmq4mhpxmkzm.instabox.tech"
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36")

url2rel = {}
failed = []
done = 0


def get(url):
    req = urllib.request.Request(url, headers={
        "User-Agent": UA,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Accept-Encoding": "identity",
        "Referer": BASE,
    })
    with urllib.request.urlopen(req, timeout=TIMEOUT) as r:
        return r.read()


ALLOWED_HOSTS = {
    "tophub.today", "www.tophub.today",
    "file.ipadown.com", "file.ibmwclub.com",
    "s0.zstatic.net", "s1.zstatic.net", "s2.zstatic.net",
    "s3.zstatic.net", "s4.zstatic.net",
}


def rel_of(url):
    p = urllib.parse.urlsplit(url)
    path = posixpath.normpath(urllib.parse.unquote(p.path.lstrip("/")) or "index.html")
    if path.startswith("..") or not path:
        path = hashlib.sha1(url.encode()).hexdigest()
    if p.netloc not in ("tophub.today", "www.tophub.today"):
        path = f"cdn/{p.netloc}/{path}"
    root, ext = posixpath.splitext(path)
    if p.query:
        path = f"{root}-{hashlib.sha1(p.query.encode()).hexdigest()[:8]}{ext}"
    return path


def same_origin(url):
    p = urllib.parse.urlsplit(url)
    return p.scheme in ("http", "https") and p.netloc in ALLOWED_HOSTS


def fetch_one(url):
    global done
    rel = rel_of(url)
    dst = os.path.join(OUT, rel)
    if os.path.exists(dst) and os.path.getsize(dst) > 0:
        url2rel[url] = rel
        return rel
    try:
        data = get(url)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        with open(dst, "wb") as f:
            f.write(data)
        url2rel[url] = rel
        done += 1
        return rel
    except Exception as e:  # noqa: BLE001
        failed.append(f"{url} -> {e}")
        url2rel[url] = None
        return None


ATTR_RE = re.compile(r"""(?P<attr>\b(?:href|src|srcset)=)(?P<q>["'])(?P<val>[^"']*)(?P=q)""", re.I)
CSS_URL_RE = re.compile(r"""url\(\s*['"]?([^'")]+)['"]?\s*\)""")


def collect_refs(html):
    urls = set()
    for m in ATTR_RE.finditer(html):
        val = m.group("val")
        if val.startswith(("data:", "javascript:", "mailto:", "#", "tel:")):
            continue
        refs = [x.strip().split(" ")[0] for x in val.split(",")] if m.group("attr").lower().startswith("srcset") else [val]
        for ref in refs:
            if not ref:
                continue
            absu = urllib.parse.urljoin(BASE, ref)
            if same_origin(absu):
                urls.add(absu)
    return urls


def rewrite_css_refs(css_paths):
    """css 里的 url() 也抓下来，改成 /本地路径。"""
    extra = set()
    for url, rel in list(url2rel.items()):
        if not rel or not rel.endswith(".css"):
            continue
        try:
            text = open(os.path.join(OUT, rel), encoding="utf-8", errors="replace").read()
        except Exception:  # noqa: BLE001
            continue
        for m in CSS_URL_RE.finditer(text):
            ref = m.group(1).strip()
            if ref.startswith(("data:", "#")):
                continue
            absu = urllib.parse.urljoin(url, ref)
            if same_origin(absu):
                extra.add(absu)
    if extra:
        with ThreadPoolExecutor(WORKERS) as ex:
            list(ex.map(fetch_one, sorted(extra)))


def rewrite_css_files():
    for url, rel in list(url2rel.items()):
        if not rel or not rel.endswith(".css"):
            continue
        p = os.path.join(OUT, rel)
        try:
            text = open(p, encoding="utf-8", errors="replace").read()
        except Exception:  # noqa: BLE001
            continue

        def sub(m):
            ref = m.group(1).strip()
            if ref.startswith(("data:", "#")):
                return m.group(0)
            absu = urllib.parse.urljoin(url, ref)
            if not same_origin(absu):
                return m.group(0)
            r = url2rel.get(absu)
            return f"url(/{r})" if r else m.group(0)

        new = CSS_URL_RE.sub(sub, text)
        if new != text:
            with open(p, "w", encoding="utf-8") as f:
                f.write(new)


def patch_redirects():
    """去掉 app.js 里跳回 tophub.today 的逻辑，并把本站域名加进 allowedDomains。"""
    patched = []
    for root, _dirs, files in os.walk(os.path.join(OUT, "cdn")):
        for name in files:
            if not (name.startswith("app.") and name.endswith(".js")):
                continue
            p = os.path.join(root, name)
            try:
                text = open(p, encoding="utf-8", errors="replace").read()
            except Exception:  # noqa: BLE001
                continue
            new = text.replace('window.location.href = "https://tophub.today/";',
                               "void 0; /* redirect disabled */")
            new = new.replace('var allowedDomains = ["tophub.today"',
                              'var allowedDomains = ["%s", "tophub.today"' % PUB_HOST)
            if new != text:
                with open(p, "w", encoding="utf-8") as f:
                    f.write(new)
                patched.append(name)
    print(f"patched js: {patched}", flush=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    html = get(BASE).decode("utf-8", "replace")
    print(f"html bytes: {len(html)}", flush=True)

    refs = sorted(collect_refs(html))
    print(f"refs: {len(refs)}", flush=True)
    with ThreadPoolExecutor(WORKERS) as ex:
        list(ex.map(fetch_one, refs))

    rewrite_css_refs(url2rel)
    rewrite_css_files()
    patch_redirects()

    def repl(m):
        q, val, attr = m.group("q"), m.group("val"), m.group("attr")
        if val.startswith(("data:", "javascript:", "mailto:", "#", "tel:")):
            return m.group(0)
        is_srcset = attr.lower().startswith("srcset")
        refs_ = [x.strip().split(" ")[0] for x in val.split(",")] if is_srcset else [val]
        out = []
        for ref in refs_:
            if not ref:
                continue
            absu = urllib.parse.urljoin(BASE, ref)
            if not same_origin(absu):
                out.append(ref)
                continue
            r = url2rel.get(absu)
            out.append(f"/{r}" if r else ref)
        newval = ", ".join(out) if is_srcset else out[0]
        return f"{attr}{q}{newval}{q}"

    html = ATTR_RE.sub(repl, html)

    def inline(m):
        body = m.group(2)

        def sub2(mm):
            ref = mm.group(1).strip()
            if ref.startswith(("data:", "#")):
                return mm.group(0)
            absu = urllib.parse.urljoin(BASE, ref)
            return f"url(/{url2rel[absu]})" if same_origin(absu) and url2rel.get(absu) else mm.group(0)

        return m.group(1) + CSS_URL_RE.sub(sub2, body) + m.group(3)

    html = re.sub(r"""(style=["'])([^"']*)(["'])""", inline, html)

    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)

    ok = len([v for v in url2rel.values() if v])
    print(f"done: {done} new files, {ok}/{len(url2rel)} assets ok, {len(failed)} failed", flush=True)
    for line in failed[:10]:
        print("  -", line, flush=True)


if __name__ == "__main__":
    main()