# DNS Zone Management Helper

## Open zone file

Use vscode File > Open File

```bash
/etc/bind/zones/sistemas.charqueadas.ifsul.edu.br.zone
```

## Add subdomain

1. Add A record in zone file:

```
subdomain        IN      A       200.132.47.37
```

2. Update serial number in SOA record (format: YYYYMMDDNN)

3. Restart bind9 service:

```bash
sudo systemctl restart bind9
```

## Verify DNS propagation

### Local verification

```bash
nslookup subdomain.sistemas.charqueadas.ifsul.edu.br
```

### Online verification

Use [DNS Checker](https://dnschecker.org/#A/sistemas.charqueadas.ifsul.edu.br) to verify if the new subdomain is propagated.

## Configure nginx to create SSL certificate

Use the compose.yaml file to configure nginx for the new subdomain.