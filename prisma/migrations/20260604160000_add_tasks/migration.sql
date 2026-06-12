-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "displayId" TEXT NOT NULL,
    "projeto" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "clienteEmail" TEXT,
    "clienteTel" TEXT,
    "servico" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Não agendado',
    "descricao" TEXT NOT NULL,
    "anotInternas" TEXT,
    "anotPropriedade" TEXT,
    "endereco" JSONB,
    "dataAgendada" TEXT,
    "horario" TEXT,
    "baia" INTEGER,
    "duracaoHoras" DOUBLE PRECISION,
    "tecnico" TEXT,
    "tecnicoStatus" TEXT NOT NULL DEFAULT '—',
    "tecnicoNotas" TEXT,
    "orcamento" JSONB,
    "anexos" JSONB NOT NULL DEFAULT '[]',
    "qa" JSONB,
    "agendaPreferencial" TEXT,
    "log" JSONB NOT NULL DEFAULT '[]',
    "clientId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Task_displayId_key" ON "Task"("displayId");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
