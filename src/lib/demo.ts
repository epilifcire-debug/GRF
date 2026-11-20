import type { ReportHeader, StaffMember } from "./staff";

/** Dados fictícios usados apenas no build de preview */
export const DEMO_STAFF: StaffMember[] = [
  {
    "id": "demo-1",
    "name": "José Ferreira Silva",
    "pixKey": "601.815.908-24",
    "pixType": "cpf",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000000
  },
  {
    "id": "demo-2",
    "name": "Maria Costa Santos",
    "pixKey": "(79) 98176-8104",
    "pixType": "telefone",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000001
  },
  {
    "id": "demo-3",
    "name": "João Ribeiro Oliveira",
    "pixKey": "joao.ribeiro@email.com",
    "pixType": "email",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000002
  },
  {
    "id": "demo-4",
    "name": "Ana Rodrigues Oliveira",
    "pixKey": "860.913.909-37",
    "pixType": "cpf",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000003
  },
  {
    "id": "demo-5",
    "name": "Carlos Gomes Santos",
    "pixKey": "(79) 99999-4622",
    "pixType": "telefone",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000004
  },
  {
    "id": "demo-6",
    "name": "Francisca Oliveira Almeida",
    "pixKey": "francisca.oliveira@email.com",
    "pixType": "email",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000005
  },
  {
    "id": "demo-7",
    "name": "Paulo Lima Menezes",
    "pixKey": "628.194.821-12",
    "pixType": "cpf",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000006
  },
  {
    "id": "demo-8",
    "name": "Antônia Costa Pereira",
    "pixKey": "(79) 98199-9974",
    "pixType": "telefone",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000007
  },
  {
    "id": "demo-9",
    "name": "Lucas Silva Nascimento",
    "pixKey": "lucas.silva@email.com",
    "pixType": "email",
    "classification": "apoio",
    "value": 110,
    "createdAt": 1700000000008
  },
  {
    "id": "demo-10",
    "name": "Adriana Oliveira Nascimento",
    "pixKey": "378.657.975-08",
    "pixType": "cpf",
    "classification": "vigilante",
    "value": 120,
    "createdAt": 1700000000009
  },
  {
    "id": "demo-11",
    "name": "Marcos Nascimento Souza",
    "pixKey": "(79) 99626-3945",
    "pixType": "telefone",
    "classification": "vigilante",
    "value": 120,
    "createdAt": 1700000000010
  },
  {
    "id": "demo-12",
    "name": "Juliana Rodrigues Oliveira",
    "pixKey": "juliana.rodrigues@email.com",
    "pixType": "email",
    "classification": "vigilante",
    "value": 120,
    "createdAt": 1700000000011
  },
  {
    "id": "demo-13",
    "name": "Rafael Nascimento Almeida",
    "pixKey": "757.491.186-06",
    "pixType": "cpf",
    "classification": "vigilante",
    "value": 120,
    "createdAt": 1700000000012
  },
  {
    "id": "demo-14",
    "name": "Patrícia Pereira Gomes",
    "pixKey": "(79) 98700-3490",
    "pixType": "telefone",
    "classification": "vigilante",
    "value": 120,
    "createdAt": 1700000000013
  },
  {
    "id": "demo-15",
    "name": "Thiago Menezes Costa",
    "pixKey": "thiago.menezes@email.com",
    "pixType": "email",
    "classification": "vigilante",
    "value": 120,
    "createdAt": 1700000000014
  },
  {
    "id": "demo-16",
    "name": "Aline Oliveira Ferreira",
    "pixKey": "189.555.979-08",
    "pixType": "cpf",
    "classification": "grandes_eventos",
    "value": 130,
    "createdAt": 1700000000015
  },
  {
    "id": "demo-17",
    "name": "Bruno Barbosa Oliveira",
    "pixKey": "(79) 99720-2533",
    "pixType": "telefone",
    "classification": "grandes_eventos",
    "value": 130,
    "createdAt": 1700000000016
  },
  {
    "id": "demo-18",
    "name": "Camila Almeida Rodrigues",
    "pixKey": "camila.almeida@email.com",
    "pixType": "email",
    "classification": "grandes_eventos",
    "value": 130,
    "createdAt": 1700000000017
  },
  {
    "id": "demo-19",
    "name": "Diego Silva Santos",
    "pixKey": "497.465.075-08",
    "pixType": "cpf",
    "classification": "grandes_eventos",
    "value": 130,
    "createdAt": 1700000000018
  },
  {
    "id": "demo-20",
    "name": "Fernanda Pereira Nascimento",
    "pixKey": "(79) 98239-9088",
    "pixType": "telefone",
    "classification": "grandes_eventos",
    "value": 130,
    "createdAt": 1700000000019
  },
  {
    "id": "demo-21",
    "name": "Gustavo Oliveira Souza",
    "pixKey": "gustavo.oliveira@email.com",
    "pixType": "email",
    "classification": "lider",
    "value": 150,
    "createdAt": 1700000000020
  },
  {
    "id": "demo-22",
    "name": "Larissa Nascimento Silva",
    "pixKey": "366.712.768-54",
    "pixType": "cpf",
    "classification": "lider",
    "value": 150,
    "createdAt": 1700000000021
  },
  {
    "id": "demo-23",
    "name": "Rodrigo Almeida Barbosa",
    "pixKey": "(79) 98280-8053",
    "pixType": "telefone",
    "classification": "especial",
    "value": 180,
    "createdAt": 1700000000022
  },
  {
    "id": "demo-24",
    "name": "Vanessa Almeida Carvalho",
    "pixKey": "vanessa.almeida@email.com",
    "pixType": "email",
    "classification": "especial",
    "value": 180,
    "createdAt": 1700000000023
  }
];

export const DEMO_HEADER: ReportHeader = {
  eventName: "Festival de Verão (demonstração)",
  municipality: "Aracaju/SE",
  date: "2026-12-12",
  organizer: "Produtora Exemplo",
  phone: "(79) 99999-0000",
  notes: "Dados fictícios para avaliar o layout.",
};
