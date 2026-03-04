# QQ 邮箱配置说明 - 找回密码功能

## 1. 获取 QQ 邮箱授权码

1. 登录 [QQ 邮箱](https://mail.qq.com)
2. 点击 **设置** → **账户**
3. 找到 **POP3/IMAP/SMTP/Exchange/CardDAV/CalDAV服务**
4. 开启 **POP3/SMTP 服务** 或 **IMAP/SMTP 服务**
5. 按提示发送短信验证后，会获得一个 **16 位授权码**
6. **重要**：授权码不是 QQ 密码，请妥善保存

## 2. 配置 .env 文件

在 `04-system/backend` 目录下，复制 `.env.example` 为 `.env`，然后填写：

```
SMTP_HOST=smtp.qq.com
SMTP_PORT=465
SMTP_USER=你的QQ号@qq.com
SMTP_PASS=你的16位授权码
```

例如：
```
SMTP_USER=123456789@qq.com
SMTP_PASS=abcdefghijklmnop
```

## 3. 部署时的额外配置

若部署到线上，需设置 `FRONTEND_URL` 为实际前端地址，否则邮件中的重置链接会指向 localhost：

```
FRONTEND_URL=https://你的网站.vercel.app
```

## 4. 测试

1. 注册新账号时填写邮箱
2. 在登录页点击「忘记密码？」
3. 输入邮箱并提交
4. 查收邮件，点击链接重置密码

若未收到邮件，请检查：
- 垃圾箱
- .env 中的 SMTP_USER、SMTP_PASS 是否正确
- 后端控制台是否有「发送邮件失败」的报错
