import { Position } from './TerrainModels.ts';
import { PumpID } from './BasinModels.ts';

export type PumpMode = "inlet" | "outlet";

export class Pump {
  public readonly id: PumpID;
  public readonly position: Position;
  public readonly reservoirId: number;
  public mode: PumpMode;

  constructor(
    id: PumpID,
    position: Position,
    reservoirId: number,
    mode: PumpMode
  ) {
    this.id = id;
    this.position = position;
    this.reservoirId = reservoirId;
    this.mode = mode;
  }
}

