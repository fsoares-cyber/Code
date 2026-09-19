-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_componentId_fkey" FOREIGN KEY ("componentId") REFERENCES "Component"("id") ON DELETE SET NULL ON UPDATE CASCADE;
