import React from 'react';
import './App.css';
import PrismaZoom from 'react-prismazoom';
import * as lib from './components/lib';
import { useContainerDimensions } from './components/lib';
import { svgs } from './components/svgs';

const WIDTH = 15;
const HEIGHT = 15;
const SCALE = 0.5;
const PERCENTAGE = 0.3; //0.3
const NBOMBS = Math.round(WIDTH * HEIGHT * PERCENTAGE); // 20% of WIDTH * HEIGHT

// const BOMBS = Array.from({ length: WIDTH }, () =>
//     Array.from({ length: HEIGHT }, () => 0),
// );

const _bombs = lib.createGrid([WIDTH, HEIGHT]);

const _neighbors: lib.NGrid = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => 0),
);

const _status: lib.SGrid = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => {
        return 'hidden';
    }),
);

const _borders = Array.from({ length: HEIGHT }, () =>
    Array.from({ length: WIDTH }, () => {
        return 'none';
    }),
);

// console.log('Bombs');
// console.log(BOMBS);
// console.log('NEIGHBORS');
// console.log(_neighbors);
// console.log('status');
// console.log(_status);

function App() {
    const [bombs, setBombs] = React.useState(_bombs);
    const [neighbors, setNeighbors] = React.useState(_neighbors);
    const [statuses, setStatuses] = React.useState(_status);
    const [generated, setGenerated] = React.useState(false);
    const borders = React.useMemo(() => {
        statuses.map((row, y) =>
            row?.map((status, x) => {
                // let color = {
                //     hidden: '#41A3CD',
                //     flagged: '#808F9E',
                //     revealed: '#0000',
                // }[status];

                const equal = (x: number, y: number) =>
                    statuses[y][x] === status;

                var equalsAround = [];

                for (var i = -1; i <= 1; i++) {
                    for (var j = -1; j <= 1; j++) {
                        if (
                            x + i >= 0 &&
                            x + i < WIDTH &&
                            y + j >= 0 &&
                            y + j < HEIGHT &&
                            !(i === 0 && j === 0)
                        ) {
                            if (statuses[y + j][x + i] === status)
                                switch ([i, j].join(' ')) {
                                    case '-1 -1':
                                        if (
                                            equal(x + 0, y - 1) &&
                                            equal(x - 1, y + 0)
                                        )
                                            equalsAround.push([i, j]);
                                        break;
                                    case '-1 1':
                                        if (
                                            equal(x + 0, y + 1) &&
                                            equal(x - 1, y + 0)
                                        )
                                            equalsAround.push([i, j]);
                                        break;
                                    case '1 -1':
                                        if (
                                            equal(x + 0, y - 1) &&
                                            equal(x + 1, y + 0)
                                        )
                                            equalsAround.push([i, j]);
                                        break;
                                    case '1 1':
                                        if (
                                            equal(x + 0, y + 1) &&
                                            equal(x + 1, y + 0)
                                        )
                                            equalsAround.push([i, j]);
                                        break;
                                    default:
                                        equalsAround.push([i, j]);
                                }
                        }
                    }
                }

                _borders[y][x] = JSON.stringify(equalsAround);
            }),
        );
        return _borders;
    }, [statuses]);
    const cleared = React.useRef<{ x: number; y: number }[]>([
        { x: -1, y: -1 },
    ]);

    const clicking = React.useRef(false);
    const canvas = React.useRef({ posX: 0, posY: 0 });
    const lastCanvas = React.useRef({ posX: 0, posY: 0 });

    const [hoveredCell, setHoveredCell] = React.useState({ x: 0, y: 0 });

    const handleClick = (
        x: number,
        y: number,
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
        e.preventDefault();
        // console.warn('click', x, y);
        if (!generated) {
            if (e.button === 0) {
                handleFirstClick(x, y);
                if (neighbors[y][x] === 0) clearBlank(x, y);
                else revealCell(x, y);
            }
        } else {
            if (e.button === 0) {
                if (neighbors[y][x] === 0) clearBlank(x, y);
                else revealCell(x, y);
            } else if (e.button === 2) {
                toggleFlag(x, y);
            }
        }
    };

    const handleMouseDown = (
        x: number,
        y: number,
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
        clicking.current = true;
        lastCanvas.current = canvas.current;
    };

    const handleMouseUp = (
        x: number,
        y: number,
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
        if (
            clicking.current &&
            canvas.current.posX === lastCanvas.current.posX &&
            canvas.current.posY === lastCanvas.current.posY
        ) {
            clicking.current = false;
            handleClick(x, y, e);
        }
    };

    function toggleFlag(x: number, y: number) {
        let tempStatus = [...statuses];
        if (tempStatus[y][x] === 'flagged') tempStatus[y][x] = 'hidden';
        else if (tempStatus[y][x] === 'hidden') tempStatus[y][x] = 'flagged';
        setStatuses(tempStatus);
    }

    function revealCell(x: number, y: number) {
        let tempStatus = [...statuses];
        if (tempStatus[y][x] === 'hidden') {
            tempStatus[y][x] = 'revealed';
            setStatuses(tempStatus);
        }
    }

    function clearBlank(x: number, y: number) {
        if (
            neighbors[y][x] !== 0 ||
            cleared.current.find((e) => e.x === x && e.y === y)
        )
            return;
        clearAround(x, y);
        checkSurroundings(x, y).forEach(({ x, y }) => clearBlank(x, y));
    }

    function clearAround(x: number, y: number) {
        let tempStatus = [...statuses];
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if (
                    x + i >= 0 &&
                    x + i < WIDTH &&
                    y + j >= 0 &&
                    y + j < HEIGHT
                ) {
                    if (tempStatus[y + j][x + i] === 'hidden')
                        tempStatus[y + j][x + i] = 'revealed';
                }
            }
        }
        setStatuses(tempStatus);
        if (!cleared.current.find((e) => e.x === x && e.y === y))
            cleared.current.push({ x: x, y: y });
    }

    function checkSurroundings(
        x: number,
        y: number,
    ): { x: number; y: number }[] {
        var emptyCells: { x: number; y: number }[] = [];
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if (
                    x + i >= 0 &&
                    x + i < WIDTH &&
                    y + j >= 0 &&
                    y + j < HEIGHT
                ) {
                    if (neighbors[y + j][x + i] === 0 && (i !== 0 || j !== 0))
                        emptyCells.push({ x: x + i, y: y + j });
                }
            }
        }
        return emptyCells;
    }

    const handleFirstClick = (x: number, y: number) => {
        var tempBombArr = Array.from({ length: WIDTH * HEIGHT }, (_, i) =>
            i < NBOMBS ? true : false,
        );

        let pass = false;

        var neigh = [...neighbors];
        while (!pass) {
            var tempBombs = lib.unlinealiseGrid(lib.shuffle(tempBombArr), [
                WIDTH,
                HEIGHT,
            ]);
            // console.log('temp -> neigh');
            // console.log(tempBombs);
            // console.log(neigh);
            setBombs(tempBombs);
            for (var m = 0; m < WIDTH; m++) {
                for (var n = 0; n < HEIGHT; n++) {
                    var sum = 0;
                    for (var i = -1; i <= 1; i++) {
                        for (var j = -1; j <= 1; j++) {
                            if (
                                m + i >= 0 &&
                                m + i < WIDTH &&
                                n + j >= 0 &&
                                n + j < HEIGHT
                            ) {
                                // debugger;
                                if (tempBombs[n + j][m + i]) sum++;
                            }
                        }
                    }

                    neigh[n][m] = sum;

                    if (tempBombs[n][m]) {
                        neigh[n][m] = -1;
                    }
                }
            }
            if (neigh[y][x] === 0) {
                pass = true;
            }
        }
        setNeighbors(neigh);
        setGenerated(true);

        //timeout 1 second
        function sleep(milliseconds: number) {
            const date = Date.now();
            let currentDate = null;
            do {
                currentDate = Date.now();
            } while (currentDate - date < milliseconds);
        }

        /*
        {
            setTimeout(() => {
                var solverOutput = {
                    bombs: [{ x: 0, y: 0 }],
                    safe: [{ x: 0, y: 0 }],
                };

                while (
                    solverOutput.bombs.length > 0 ||
                    solverOutput.safe.length > 0
                ) {
                    solverOutput.bombs = [];
                    solverOutput.safe = [];

                    solverOutput = lib.solver(
                        [WIDTH, HEIGHT],
                        bombs,
                        neighbors,
                        statuses,
                    );
                    solverOutput.bombs.forEach((e) => toggleFlag(e.x, e.y));
                    solverOutput.safe.forEach((e) => revealCell(e.x, e.y));
                    sleep(1000);
                }
            }, 500);
        }
        */
    };

    React.useEffect(() => {
        // define a custom handler function
        // for the contextmenu event
        const handleContextMenu = (e: any) => {
            // prevent the right-click menu from appearing
            e.preventDefault();
        };

        // attach the event listener to
        // the document object
        document.addEventListener('contextmenu', handleContextMenu);

        // clean up the event listener when
        // the component unmounts
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    const componentRef = React.useRef(null);
    const { width, height } = useContainerDimensions(componentRef);

    /*
    React.useEffect(() => {
        // console.error(statuses);
        statuses.map((row, y) =>
            row?.map((status, x) => {
                let color = {
                    hidden: '#41A3CD',
                    flagged: '#808F9E',
                    revealed: '#0000',
                }[status];

                const equal = (x: number, y: number, x0: number, y0: number) =>
                    statuses[y][x] === statuses[y0][x0];

                borders.current[y][x] = `${
                    x < WIDTH
                        ? equal(x, y, x + 1, y)
                            ? `${width * 0.0825}px 0px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    x > 0
                        ? equal(x, y, x - 1, y)
                            ? `-${width * 0.0825}px 0px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    y < HEIGHT - 1
                        ? equal(x, y, x, y + 1)
                            ? `0px ${height * 0.0825}px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    y > 0
                        ? equal(x, y, x, y - 1)
                            ? `0px -${height * 0.0825}px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    y > 0 && x > 0
                        ? equal(x, y, x - 1, y - 1) &&
                          equal(x, y, x - 1, y) &&
                          equal(x, y, x, y - 1)
                            ? `-${height * 0.0825}px -${
                                  height * 0.0825
                              }px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    y < HEIGHT - 1 && x < WIDTH
                        ? equal(x, y, x + 1, y + 1) &&
                          equal(x, y, x + 1, y) &&
                          equal(x, y, x, y + 1)
                            ? `${height * 0.0825}px ${
                                  height * 0.0825
                              }px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    y > 0 && x < WIDTH
                        ? equal(x, y, x + 1, y - 1) &&
                          equal(x, y, x + 1, y) &&
                          equal(x, y, x, y - 1)
                            ? `${height * 0.0825}px -${
                                  height * 0.0825
                              }px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }, ${
                    y < HEIGHT - 1 && x > 0
                        ? equal(x, y, x - 1, y + 1) &&
                          equal(x, y, x - 1, y) &&
                          equal(x, y, x, y + 1)
                            ? `-${height * 0.0825}px ${
                                  height * 0.0825
                              }px 0px ${color}`
                            : '0 0 #0000'
                        : '0 0 #0000'
                }`;
            }),
        );
    }, [statuses]);
    */

    React.useEffect(() => {
        // console.error(borders);
        // console.log(borders[0][0]);
        // console.warn((svgs as any)[borders[0][0]]);
        // console.log();
    }, [borders]);

    return (
        <div className='App' style={{ width: '100%', height: '100%' }}>
            <div
                // hidden
                style={{
                    position: 'absolute',
                    width: 80,
                    // height: 60,
                    backgroundColor: '#f004',
                    zIndex: 2,
                    color: 'white',
                    textAlign: 'left',
                    paddingLeft: 20,
                    paddingBlock: 10,
                }}
            >
                <span>x: {hoveredCell.x !== -1 ? hoveredCell.x : '-'}</span>
                <br />
                <span>y: {hoveredCell.y !== -1 ? hoveredCell.y : '-'}</span>
                <br />
                <span>
                    b:{' '}
                    {hoveredCell.x !== -1 && hoveredCell.y !== -1
                        ? borders[hoveredCell.y][hoveredCell.x]
                        : '-'}
                </span>
            </div>
            <PrismaZoom
                id='prisma-zoom'
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000',
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                    // transform: 'scale(0.2)',
                }}
                doubleTouchMaxDelay={0}
                minZoom={1}
                maxZoom={5}
                onPanChange={(e) => {
                    canvas.current = e;
                }}
            >
                <div
                    id='grid'
                    style={{
                        display: 'grid',
                        // gap: 10,
                        gridTemplateColumns: `repeat(${WIDTH}, 1fr)`,
                        gridTemplateRows: `repeat(${HEIGHT}, 1fr)`,
                        aspectRatio: WIDTH / HEIGHT,
                        maxWidth:
                            (Math.min(window.innerWidth, window.innerHeight) -
                                24) *
                            5,
                        maxHeight:
                            (Math.min(window.innerWidth, window.innerHeight) -
                                24) *
                            5,
                        width: WIDTH / HEIGHT >= 1 ? `calc(100% * 5)` : 'auto',
                        height: WIDTH / HEIGHT < 1 ? `calc(100% * 5)` : 'auto',
                        margin: 0,
                        position: 'absolute',
                        transform: `scale3d(0.2,0.2,1)`,
                    }}
                >
                    {bombs?.map((row, y) =>
                        row?.map((bomb, x) => (
                            <div
                                key={`${x}-${y}`}
                                id={`${x}-${y}`}
                                style={{
                                    backgroundColor: '#0D151D',
                                    cursor: 'pointer',
                                    position: 'relative',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    display: 'flex',
                                    margin: -1,
                                }}
                                // onClick={(e) => handleClick(i, j, e)}
                                onMouseDown={(e) => handleMouseDown(x, y, e)}
                                onMouseUp={(e) => handleMouseUp(x, y, e)}
                                // onContextMenu={(e) => handleClick(x, y, e)}
                                onMouseEnter={(e) =>
                                    setHoveredCell({ x: x, y: y })
                                }
                                onMouseLeave={(e) =>
                                    setHoveredCell({ x: -1, y: -1 })
                                }
                                ref={componentRef}
                            >
                                {
                                    <div
                                        className='hidden_cell'
                                        style={{
                                            position: 'absolute',
                                            width: '100%',
                                            height: '100%',

                                            zIndex: 69,
                                        }}
                                    >
                                        <svg
                                            viewBox='0 0 100 100'
                                            fill={
                                                {
                                                    hidden: '#41A3CD',
                                                    flagged: '#808F9E',
                                                    revealed: '#0000',
                                                }[statuses[y][x]]
                                            }
                                        >
                                            {
                                                {
                                                    hidden: (svgs as any)[
                                                        borders[y][x]
                                                    ],
                                                    flagged: (
                                                        <g>
                                                            {
                                                                (svgs as any)[
                                                                    borders[y][
                                                                        x
                                                                    ]
                                                                ]
                                                            }
                                                            <path
                                                                d='M67.522,33.975H56.132l-0.487-2.481c-0.303-1.543-1.655-2.656-3.228-2.656H34.734c-1.47,0-2.661,1.191-2.661,2.661v37.714h0 c0,0.001,0,0.001,0,0.002c0,1.474,1.195,2.67,2.67,2.67s2.67-1.195,2.67-2.67c0-0.001,0-0.001,0-0.002h0V54.457h13.81l0.53,2.475 c0.325,1.517,1.665,2.601,3.216,2.601h12.554c1.47,0,2.661-1.191,2.661-2.661V36.636C70.183,35.167,68.992,33.975,67.522,33.975z'
                                                                fill='#000'
                                                            />
                                                        </g>
                                                    ),
                                                    revealed: bomb ? (
                                                        <circle
                                                            fill='#eee'
                                                            cx='50'
                                                            cy='50'
                                                            r='22'
                                                        />
                                                    ) : (
                                                        <text
                                                            x='50%'
                                                            y='50%'
                                                            textAnchor='middle'
                                                            dominantBaseline='middle'
                                                            style={{
                                                                fontSize:
                                                                    '250%',
                                                                fontWeight:
                                                                    'bold',
                                                                color: '#ddd',
                                                                textAlign:
                                                                    'center',
                                                                zIndex: 10,
                                                            }}
                                                            fill='#ddd'
                                                        >
                                                            {neighbors[y][x] >
                                                                0 &&
                                                                neighbors[y][x]}
                                                        </text>
                                                    ),
                                                }[statuses[y][x]]
                                            }
                                        </svg>
                                    </div>
                                }
                            </div>
                        )),
                    )}
                </div>
            </PrismaZoom>
        </div>
    );
}

export default App;
