import { ApiProperty } from '@nestjs/swagger';

export enum SortOrder {
  asc = 'asc',
  desc = 'desc',
}

export class SortOrderInput {
  @ApiProperty({ enum: SortOrder, enumName: 'SortOrder' })
  sortOrder: SortOrder = SortOrder.asc;
}
