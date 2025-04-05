import { useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { GridCell, GridPath } from '@/helpers/grid'

// Static name for clickable grid cells
const CLICKABLE_CELL_NAME = 'clickable-grid-cell'

interface GridProps {
    width: number
    height: number
    onCellClick: (x: number, z: number) => void
    occupiedCells: Set<string>
    obstacles: GridCell[]
    targetCell: GridCell | null
    path: GridPath
}

export const Grid: React.FC<GridProps> = ({
    width,
    height,
    onCellClick,
    occupiedCells,
    obstacles,
    targetCell,
    path
}) => {
    return (
        <>
            {/* grid click handler */}
            <ClickableGrid onCellClick={onCellClick} />

            {/* custom grid with cell lines */}
            <group position={[width / 2, 0, height / 2]}>
                <gridHelper
                    args={[width, width, '#444', '#222']}
                    position={[0, 0, 0]}
                    rotation={[0, 0, 0]}
                />
            </group>

            {/* ground */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[width / 2, -0.01, height / 2]}
                receiveShadow
            >
                <planeGeometry args={[width, height]} />
                <meshStandardMaterial color="#111" />
            </mesh>

            {/* grid cell visualization */}
            <GridCells
                width={width}
                height={height}
                occupiedCells={occupiedCells}
                obstacles={obstacles}
                targetCell={targetCell}
                path={path}
            />
        </>
    )
}

interface GridCellsProps {
    width: number
    height: number
    occupiedCells: Set<string>
    obstacles: GridCell[]
    targetCell: GridCell | null
    path: GridPath
}

const GridCells: React.FC<GridCellsProps> = ({
    width,
    height,
    occupiedCells,
    obstacles,
    targetCell,
    path
}) => {
    return (
        <>
            {Array.from({ length: width * height }).map((_, index) => {
                // grid cells with coordinates from 0 to width-1/height-1
                const x = index % width
                const z = Math.floor(index / width)
                const cellKey = `${x.toString()},${z.toString()}`

                // cell states
                const isOccupied = occupiedCells.has(cellKey)
                const isObstacle = obstacles.some(obs => obs.x === x && obs.z === z)
                const isTarget = targetCell && targetCell.x === x && targetCell.z === z
                const isPathCell = path.some(cell => cell.x === x && cell.z === z)

                // cell color based on state
                let cellColor = '#b8b8b8' // default floor color
                if (isTarget) cellColor = '#2563eb'
                else if (isPathCell) cellColor = '#6280b2'
                else if (isObstacle) cellColor = '#7c2d12'
                else if (isOccupied) cellColor = '#1a365d'

                // position each cell at integer + 0.5 to center it within the grid unit
                return (
                    <mesh
                        key={index}
                        position={[x + 0.5, 0, z + 0.5]}
                        rotation={[-Math.PI / 2, 0, 0]}
                        name={CLICKABLE_CELL_NAME}
                    >
                        <planeGeometry args={[0.95, 0.95]} />
                        <meshBasicMaterial
                            color={cellColor}
                        />
                    </mesh>
                )
            })}
        </>
    )
}

export function ClickableGrid(
    { onCellClick }: { onCellClick: (x: number, z: number) => void }
) {
    const { camera, raycaster, pointer, scene } = useThree()

    useEffect(() => {
        const handleClick = () => {
            // raycaster using current mouse position
            raycaster.setFromCamera(pointer, camera)

            // find objects intersecting the picking ray
            const intersects = raycaster.intersectObjects(scene.children, true)

            for (const intersect of intersects) {
                // Check if the intersected object is a mesh with our static name
                if (intersect.object.name === CLICKABLE_CELL_NAME) {
                    // Get grid coordinates from mesh position
                    const x = Math.floor(intersect.object.position.x)
                    const z = Math.floor(intersect.object.position.z)
                    console.log(`Clicked cell at grid coordinates: (${x.toString()}, ${z.toString()} with name ${intersect.object.name})`)
                    onCellClick(x, z)
                    break
                }
            }
        }

        window.addEventListener('click', handleClick)

        return () => {
            window.removeEventListener('click', handleClick)
        }
    }, [camera, raycaster, pointer, scene, onCellClick])

    return null
}