import { AppDataSource } from "../data-source";
import { RegistrationEntity } from "../entities/RegistrationEntity";
import XLSXService from "../services/XLSXService";
import RegistrationMail from "../mails/RegistrationMail";
import JobInterface from "./JobInterface";
import { Repository } from "typeorm";
import MailSetup from "../MailSetup";

class SendRegistrationNotificationJob implements JobInterface {
  private filePath: string = "./public/xlsx/skats-positivliste.xlsx";
  private registrationRepository: Repository<RegistrationEntity> =
    AppDataSource.getRepository(RegistrationEntity);

  private async send(): Promise<void> {
    const xlsxData = await XLSXService.fetchXLSXFileData(this.filePath);

    for (const row of xlsxData.values) {
      await this.processRegistrations(row);
    }
  }

  private async processRegistrations(row: any): Promise<void> {
    const mailSetup = new MailSetup();
    const registrationsNotSent = await this.fetchUnnotifiedRegistrations(
      row.ISIN
    );

    for (const registration of registrationsNotSent) {
      new RegistrationMail(mailSetup, registration).send();

      await this.markRegistrationAsNotified(registration);
      console.info("Registration updated");
    }
  }

  private async fetchUnnotifiedRegistrations(
    isin: string
  ): Promise<RegistrationEntity[]> {
    return await this.registrationRepository.find({
      where: {
        isin: isin,
        isNotified: false,
      },
    });
  }

  private async markRegistrationAsNotified(
    registration: RegistrationEntity
  ): Promise<void> {
    await this.registrationRepository.save({
      ...registration,
      isNotified: true,
    });
  }

  public async main(): Promise<void> {
    await this.send();
  }
}
export default new SendRegistrationNotificationJob();
