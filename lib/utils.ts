'use client'

import { Vector3 } from 'three'

// Grid dimensions
export const GRID_WIDTH = 10
export const GRID_HEIGHT = 10

// Obstacles data
export const OBSTACLES = [
  { x: 2, z: 3 },
  { x: 5, z: 5 },
  { x: 7, z: 2 },
  { x: 3, z: 7 },
  { x: 8, z: 8 },
]

// Helper function to convert cell coordinates to string key
export const cellToKey = (x: number, z: number): string => 
  `${x.toString()},${z.toString()}`

// Helper function to convert position to cell coordinates
export const positionToCell = (position: Vector3): [number, number] => 
  [Math.floor(position.x), Math.floor(position.z)]

// Helper function to convert cell coordinates to centered position
export const cellToPosition = (x: number, z: number): Vector3 => 
  new Vector3(x + 0.5, 0.5, z + 0.5)

// Helper function to check if a cell is within grid bounds
export const isCellInBounds = (x: number, z: number): boolean => 
  x >= 0 && x < GRID_WIDTH && z >= 0 && z < GRID_HEIGHT

// Helper function to check if a cell has an obstacle
export const hasCellObstacle = (x: number, z: number): boolean => 
  OBSTACLES.some(obs => obs.x === x && obs.z === z)
