# Integração local Product Lab ↔ aXet Flows

## 1. Objetivo

Identificar uma forma estável de o **aXet Flows** acessar a API do **Product Lab**, executada localmente no Windows, sem depender do endereço IP dinâmico da estação.

A API do Product Lab utiliza:


Porta: 8000


O aXet Flows executa o Node-RED dentro de um container Docker gerenciado pelo próprio aXet Desktop.

---

## 2. Problema inicial

Inicialmente a Data API foi configurada no Flow como:


http://localhost:8000


Porém, as chamadas realizadas pelo node HTTP Request retornavam:


ECONNREFUSED 127.0.0.1:8000


O Product Lab estava funcionando normalmente no Windows em:


http://localhost:8000/api/docs


Isso demonstrou que o `localhost` utilizado pelo aXet Flows não representava o mesmo ambiente em que o Product Lab estava executando.

---

## 3. Identificação do ambiente do aXet Flows

As opções do aXet Desktop indicaram a existência de:


Docker
WSL
Subsystem Terminal


Foi aberto o terminal do subsistema através de:


Open subsystem terminal


O ambiente identificado foi Linux/WSL.

A execução de:

bash
ip route


retornou:


default via 192.168.0.1 dev eth2
172.17.0.0/16 dev docker0 src 172.17.0.1
192.168.0.0/24 dev eth2


E:

bash
hostname -I


retornou:


192.168.0.100
172.17.0.1


Isso demonstrou a existência de uma rede Docker interna:


172.17.0.0/16


---

## 4. Identificação do container do aXet Flows

No menu Docker do aXet foi selecionado:


Containers
→ View running containers


Foi identificado o container:


IMAGE:
axet-flows/flows:latest-prod


com Node-RED executando internamente na porta:


1880/tcp


e uma porta externa dinâmica, por exemplo:


172.17.0.1:11499 → 1880/tcp


Isso explicou por que a porta do aXet Flows muda a cada inicialização.

---

## 5. Rede interna do container

Dentro do container foi executado:

bash
ip route


Resultado:


default via 172.17.0.1 dev eth0
172.17.0.0/16 dev eth0 src 172.17.0.2


Portanto:


Docker Host/WSL
172.17.0.1

Container aXet
172.17.0.2


---

## 6. Testes de acesso ao Product Lab

Foram testados diferentes endereços para acessar:


Product Lab API :8000


### localhost


http://localhost:8000


Resultado:


ECONNREFUSED 127.0.0.1:8000


Conclusão:

`localhost` dentro do container representa o próprio container, e não o Windows.

### 127.0.0.1


http://127.0.0.1:8000


Resultado:


ECONNREFUSED


Conclusão:

mesmo comportamento de `localhost`.

### Docker Gateway

Foi testado:


http://172.17.0.1:8000


Resultado:


Couldn't connect to server


Conclusão:

o Product Lab não está disponível diretamente através da interface `docker0` do WSL.

### WSL DNS

O arquivo:


/etc/resolv.conf


apresentou:


nameserver 10.255.255.254


Foi testado:


http://10.255.255.254:8000


Resultado:


Couldn't connect to server


Conclusão:

o endereço utilizado pelo WSL para DNS não funciona como endpoint do Product Lab.

### IP da estação Windows

Foi testado:


http://192.168.0.100:8000


Resultado:


Sucesso


Isso comprovou que o container consegue acessar o Product Lab através da interface de rede do Windows.

Entretanto, essa solução não é adequada para configuração permanente porque o endereço é fornecido pela rede e pode mudar.

Exemplo observado durante os testes:


Rede anterior:
172.19.215.18

Rede atual:
192.168.0.100


---

## 7. Investigação da configuração Docker

Foi executado:

bash
docker inspect <container> --format '{{json .HostConfig.ExtraHosts}}'


Resultado:


["host.containers.internal:192.168.0.100"]


Essa configuração revelou que o próprio aXet cria um hostname interno para representar a estação host:


host.containers.internal


Também foram encontradas configurações internas do próprio aXet utilizando esse hostname, confirmando que ele faz parte da arquitetura do produto.

---

## 8. Validação do hostname

Dentro do container foi executado:

bash
getent hosts host.containers.internal


Resultado:


192.168.0.100 host.containers.internal


Em seguida:

bash
curl -I http://host.containers.internal:8000/api/docs


Resultado:


HTTP/1.1 200 OK
server: uvicorn
content-type: text/html; charset=utf-8


Isso comprovou que o container do aXet Flows consegue acessar corretamente a API do Product Lab através de:


http://host.containers.internal:8000


---

## 9. Configuração final no Flow

O `Function - Montar plano API` passou a utilizar:

javascript
var API_BASE_URL =
    "http://host.containers.internal:8000";

msg.productLabApiBaseUrl =
    API_BASE_URL;


Após a alteração, o fluxo foi testado novamente e funcionou corretamente.

---

## 10. Arquitetura validada

A comunicação local ficou:


PRODUCT LAB
Windows
API / Uvicorn
:8000
    ↑
    │
    │
host.containers.internal
    │
    │
    ↓
aXet Flows
Docker Container
Node-RED


O hostname é resolvido dentro do container para o endereço atual do host configurado pelo próprio aXet.

---

## 11. Resultado

A solução final elimina do Flow a dependência de endereços como:


localhost
127.0.0.1
192.168.x.x
172.19.x.x


A integração passa a utilizar:


host.containers.internal


A configuração validada para o ambiente local é:


http://host.containers.internal:8000


### Resultado dos testes

| Endereço | Resultado |
|---|---|
| `localhost:8000` | Falhou |
| `127.0.0.1:8000` | Falhou |
| `172.17.0.1:8000` | Falhou |
| `10.255.255.254:8000` | Falhou |
| IP atual do Windows `:8000` | Funcionou, mas é dinâmico |
| `host.containers.internal:8000` | **Funcionou** |

## 12. Conclusão

O problema não estava na API do Product Lab nem no HTTP Request do Flow.

A causa era a diferença de contexto de rede:

- Product Lab executa no Windows;
- aXet Flows executa Node-RED dentro de um container Docker;
- `localhost` dentro do container representa o próprio container.

O hostname disponibilizado pelo próprio ambiente aXet:


host.containers.internal


resolve essa comunicação e deve ser utilizado pelo Flow para acessar serviços locais executados no host Windows.

Com isso, a comunicação **aXet Flows → Product Lab API** ficou validada sem necessidade de manter o IP atual da estação hardcoded no Flow.

---

## 13. Descoberta automática da porta do aXet Flows no Product Lab

Além da comunicação **aXet Flows → Product Lab**, o Product Lab também precisa resolver a comunicação inversa:

- **Product Lab → aXet Flows**

Como o aXet Flows publica o Node-RED em uma **HostPort dinâmica**, o Product Lab não deve mais depender de uma porta digitada manualmente pelo usuário.

### Fonte da verdade adotada

A porta publicada deve ser descoberta a partir do **Docker Engine do próprio aXet**, acessado pelo named pipe do Windows:

```text
\\.\pipe\axet_flows_docker
```

equivalente a:

```text
npipe:////./pipe/axet_flows_docker
```

### Estratégia implementada

O backend do Product Lab usa um serviço dedicado:

```text
AxetFlowsDiscoveryService
```

Responsabilidades do serviço:

- conectar no Docker Engine do aXet;
- validar disponibilidade do runtime;
- localizar o container `axet-flows/flows`;
- identificar a porta interna fixa `1880/tcp`;
- descobrir a `HostPort` publicada;
- montar a URL final:
  - `http://localhost:{HostPort}/pergunta`
- validar o endpoint;
- retornar estado estruturado para uso pela API e pela UI.

### Dependência necessária

Para essa discovery funcionar, o backend precisa ter instalado o Docker SDK para Python:

```text
docker
```

Dependência adicionada em:

- `backend/requirements.txt`

### Validação real do ambiente

Após a instalação da dependência, a discovery foi validada com sucesso no ambiente local, retornando:

```json
{
  "runtime_available": true,
  "running": true,
  "healthy": true,
  "container_id": "776044f6c832092d89cc3b6eab7cc2f76df75b3ab14e7a25f304786b860b4950",
  "image": "axet-flows/flows:latest-prod",
  "internal_port": 1880,
  "host_port": 23093,
  "resolved_url": "http://localhost:23093/pergunta",
  "status": "available",
  "error": null
}
```

### Resultado prático

Isso comprova que o Product Lab consegue agora:

1. detectar o runtime Docker do aXet;
2. localizar o container correto;
3. resolver a porta dinâmica publicada;
4. montar a URL correta sem entrada manual do usuário.

Exemplo validado:

```text
1880/tcp  ->  HostPort 23093
resolved_url = http://localhost:23093/pergunta
```

### Implicação para a UI

O campo de porta na conexão `aXet Flows LLM Gateway` deve ser tratado como:

- informação de runtime;
- somente leitura;
- não mais uma configuração manual obrigatória.

Além disso, a ação **SYNC PORT** deve:

- executar uma nova discovery do runtime;
- persistir a porta resolvida em `params.port`;
- persistir a URL resolvida em `params.resolved_url`;
- atualizar `last_sync_at`;
- atualizar `last_error`;
- registrar um item em `integration_sync_logs` com `operation_type = refresh`.

Com isso:

- a coluna **LAST SYNC** da tela passa a refletir o último refresh real;
- o modal de **LOGS** da conexão aXet Flows passa a mostrar o histórico dos refreshes;
- o botão `SYNC PORT` deixa evidência operacional do que foi executado.

### Troubleshooting

Se a UI mostrar:

```text
docker_sdk_unavailable
```

significa que o backend do Product Lab ainda não tem a dependência `docker` instalada no ambiente Python ativo.

Se a dependency estiver instalada, mas o aXet estiver fechado, o comportamento esperado passa a ser algo como:

```json
{
  "runtime_available": false,
  "running": false,
  "host_port": null,
  "resolved_url": null,
  "status": "axet_not_running"
}
```

Se o runtime Docker existir, mas não houver container Flows ativo:

```json
{
  "runtime_available": true,
  "running": false,
  "host_port": null,
  "resolved_url": null,
  "status": "flows_not_running"
}
```

### Resumo operacional

A descoberta automática da porta do aXet Flows no Product Lab passa a seguir esta sequência:

```text
Product Lab
    ↓
Docker Engine do aXet
    ↓
container axet-flows/flows running
    ↓
1880/tcp
    ↓
HostPort dinâmica
    ↓
http://localhost:{HostPort}/pergunta
```

Assim, a porta deixa de ser uma configuração manual e passa a ser **estado descoberto automaticamente em runtime**.
