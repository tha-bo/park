import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Serves the JSON:API spec document.
 * OpenAPI spec is available at GET /api-json (see main.ts Swagger setup).
 */
@ApiExcludeController()
@Controller('spec')
export class SpecController {
  @Get('json-api')
  getJsonApiSpec() {
    const path = join(__dirname, 'json-api-spec.json');
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
}
