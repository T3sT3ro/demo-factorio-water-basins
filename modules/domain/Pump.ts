import { Reservoir } from "./Reservoir.ts";
import { Position } from './TerrainModels.ts';

export type PumpMode = "inlet" | "outlet";

export class Pump {
  public readonly id: number;
  public readonly position: Position;
  public readonly reservoirId: Reservoir;
  public mode: PumpMode;

  /**
   * @param id - Pump identifier
   * @param reservoir - Associated pipe system ID
   */
  constructor(
    id: number,
    position: Position,
    reservoir: Reservoir,
    mode: PumpMode
  ) {
    this.id = id;
    this.position = position;
    this.reservoirId = reservoir;
    this.mode = mode;
  }
}

