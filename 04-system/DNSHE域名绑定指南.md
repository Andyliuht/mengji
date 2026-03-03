# 使用 DNSHE 免费域名承载网站

> 将 DNSHE 申请的免费域名（如 xxx.de5.net）绑定到你的 Vercel 网站

---

## 前提条件

1. 已在 **DNSHE** 申请到免费域名（如 `mydream.de5.net`）
2. 网站已部署到 **Vercel**（参考《互联网部署指南.md》）

---

## 第一步：在 Vercel 添加自定义域名

1. 登录 https://vercel.com
2. 进入你的项目（梦境记录平台）
3. 点击 **Settings** → **Domains**
4. 在输入框填入你的 DNSHE 域名，例如：
   - `mydream.de5.net`（主域名）
   - 或 `www.mydream.de5.net`（带 www）
5. 点击 **Add**
6. Vercel 会显示需要配置的 DNS 记录，例如：
   - **CNAME** 记录：`cname.vercel-dns.com`
   - 或 **A** 记录：`76.76.21.21`

---

## 第二步：在 DNSHE 配置 DNS 解析

1. 登录 https://my.dnshe.com
2. 进入 **域名管理** 或 **DNS 解析**
3. 找到你申请的域名，添加/修改记录：

### 方式 A：使用 CNAME（推荐）

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| CNAME | @ 或留空 | cname.vercel-dns.com |

- **主机记录**：`@` 表示根域名（mydream.de5.net），若用 `www` 则访问 www.mydream.de5.net

### 方式 B：使用 A 记录

| 类型 | 主机记录 | 记录值 |
|------|----------|--------|
| A | @ 或留空 | 76.76.21.21 |

> 具体记录值以 Vercel 页面提示为准

---

## 第三步：等待生效

- DNS 解析通常 **几分钟到几小时** 生效
- 在 Vercel 的 Domains 页面可查看状态，显示 **Valid** 即配置成功

---

## 第四步：访问你的网站

配置完成后，在浏览器访问：

```
https://mydream.de5.net
```

即可打开你的梦境记录平台。

---

## 注意事项

1. **HTTPS**：Vercel 会自动为自定义域名配置 SSL 证书
2. **后端 API**：若使用 Render 部署后端，需在 Render 的 CORS 设置中加入你的域名（如 `https://mydream.de5.net`）
3. **前端 API 地址**：若之前用 `VITE_API_URL` 指向 `xxx.onrender.com`，无需修改，域名只影响用户访问前端的地址

---

## 常见问题

**Q：DNSHE 支持 CNAME 吗？**  
A：一般支持。若不确定，可在 DNSHE 控制台查看支持的记录类型。

**Q：想用 www 前缀怎么办？**  
A：主机记录填 `www`，记录值仍为 `cname.vercel-dns.com`，并在 Vercel 中同时添加 `www.mydream.de5.net`。

**Q：解析一直不生效？**  
A：可先用 `nslookup mydream.de5.net` 或在线 DNS 查询工具检查解析是否已生效。
