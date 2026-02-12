import { Controller, Delete, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { NuldsService } from "./services/nulds.service";

@ApiTags("nulds")
@Controller("nulds")
export class NuldsController {
  constructor(private readonly nuldsService: NuldsService) {}

  /**
   * Create a cron-job run (trigger Nulds fetch and event processing). JSON:API resource type: cron-jobs.
   */
  @Post("request")
  @ApiOperation({
    summary: "Create cron-job",
    description:
      "Creates a cron-job run: fetches from the Nulds API and processes events (same as the scheduled cron)."
  })
  @ApiResponse({
    status: 200,
    description: "Cron-job run completed successfully."
  })
  @ApiResponse({
    status: 500,
    description: "Cron-job run failed (e.g. fetch or processing error)."
  })
  async createCronJob() {
    await this.nuldsService.handleCron();
    return { ok: true, message: "Cron run completed" };
  }

  /**
   * Delete all data from Redis and the database.
   */
  @Delete("data")
  @ApiOperation({
    summary: "Delete all data",
    description:
      "Deletes all data in Redis (dino and carnivore keys) and the database (dinosaurs, dino_events, locations)."
  })
  @ApiResponse({ status: 200, description: "All data deleted successfully." })
  @ApiResponse({ status: 500, description: "Delete failed." })
  async deleteAllData() {
    await this.nuldsService.deleteAllData();
    return { ok: true, message: "All data deleted from Redis and database" };
  }
}
