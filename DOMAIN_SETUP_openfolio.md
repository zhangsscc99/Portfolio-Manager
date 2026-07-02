# openfolio.uk 域名配置指南

目标：让 `openfolio.uk` 和 `www.openfolio.uk` 直接访问服务器上的 Portfolio Manager 应用。

## 当前服务器信息

服务器公网 IP：

```text
103.146.124.206
```

当前 PM2 服务：

```text
portfolio-manager-gateway  -> 80
portfolio-manager-frontend -> 5000
portfolio-manager-backend  -> 5010
```

访问逻辑：

```text
openfolio.uk/      -> portfolio-manager-gateway:80 -> frontend:5000
openfolio.uk/api/  -> portfolio-manager-gateway:80 -> backend:5010
```

所以 Cloudflare 只需要把域名指向服务器 IP，不需要写 `:5000` 或 `:5010`。

## Cloudflare DNS 配置

进入 Cloudflare：

```text
openfolio.uk -> DNS -> Records
```

添加第一条记录：

```text
Type: A
Name: @
IPv4 address: 103.146.124.206
Proxy status: Proxied
TTL: Auto
```

添加第二条记录：

```text
Type: A
Name: www
IPv4 address: 103.146.124.206
Proxy status: Proxied
TTL: Auto
```

如果已有旧的 `A`、`AAAA` 或 `CNAME` 记录指向别的地址，先删除或改成上面的配置。

## Cloudflare SSL/TLS 配置

进入：

```text
SSL/TLS -> Overview
```

先选择：

```text
Flexible
```

原因：当前服务器的 Portfolio Manager gateway 监听的是 HTTP `80`，还没有直接配置服务器本地 HTTPS `443` 证书。

配置完成后，可以访问：

```text
https://openfolio.uk
https://www.openfolio.uk
```

Cloudflare 会对浏览器提供 HTTPS，再用 HTTP 转发到你的服务器。

## 推荐附加设置

进入：

```text
SSL/TLS -> Edge Certificates
```

打开：

```text
Always Use HTTPS
```

这样访问 `http://openfolio.uk` 会自动跳到 `https://openfolio.uk`。

## 验证方法

DNS 生效后，在本地电脑浏览器打开：

```text
https://openfolio.uk
```

也可以测试：

```text
https://openfolio.uk/api/health
```

如果返回健康检查 JSON 或后端响应，说明 API 代理也正常。

## 常见问题

### 1. 浏览器打不开

先确认 DNS 是否生效。可以在本地电脑运行：

```bash
nslookup openfolio.uk
```

结果应该能看到：

```text
103.146.124.206
```

如果用了 Cloudflare 橙色云，看到 Cloudflare 的 IP 也正常，因为它隐藏了真实服务器 IP。

### 2. Cloudflare 显示 521

521 通常表示 Cloudflare 连不上源站服务器。

检查：

```bash
pm2 list
ufw status
ss -ltnp | grep ':80'
```

服务器需要满足：

```text
portfolio-manager-gateway online
80/tcp ALLOW
0.0.0.0:80 正在监听
```

### 3. Cloudflare 显示 502 / Bad gateway

说明 gateway 到前端或后端失败。

检查：

```bash
pm2 list
curl -I http://127.0.0.1:5000/
curl -i http://127.0.0.1:5010/api/health
```

### 4. 页面能打开，但 API 失败

检查：

```bash
curl -i http://127.0.0.1/api/health
```

当前 gateway 规则是：

```text
/api/* -> http://127.0.0.1:5010
其他路径 -> http://127.0.0.1:5000
```

### 5. 不要把 Cloudflare 指到 8081

`8081` 是 Mistake Notebook 前端，不是 Portfolio Manager。

Portfolio Manager 对外应该使用：

```text
openfolio.uk -> 80 -> portfolio-manager-gateway
```

## 服务器端当前无需修改

服务器已经有 PM2 gateway：

```text
/root/Portfolio-Manager/portfolio-proxy.js
```

它已经监听 `80` 并转发到 Portfolio Manager 前后端。

如果以后要改成 Nginx 或 Caddy，也可以，但当前不是必须。
