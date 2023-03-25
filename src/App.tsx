import React from 'react';
import './App.css';
import PrismaZoom from 'react-prismazoom';
import * as lib from './components/lib';
import { svgs } from './components/svgs';
import { hookstate, useHookstate, State } from '@hookstate/core';
var lodash = require('lodash');

/*  ˅˅˅  CONSTANTS  ˅˅˅  */
const WIDTH = 15;
const HEIGHT = 15;
const SCALE = 0.5;
const PERCENTAGE = 0.2; //0.3
const NBOMBS = Math.round(WIDTH * HEIGHT * PERCENTAGE); // 20% of WIDTH * HEIGHT

const SEP_WIDTH: number = 8; // better if even number
const SEP_HEIGHT: string = '60%';
const SEP_COLOR: string = '#384751';
/*  ˄˄˄  CONSTANTS  ˄˄˄  */

/*  ˅˅˅  INIT ARRAYS  ˅˅˅  */
const _bombs = lib.createGrid([WIDTH, HEIGHT], false);
const _neighbors: lib.NGrid = lib.createGrid([WIDTH, HEIGHT], 0);
const _status: lib.SGrid = lib.createGrid([WIDTH, HEIGHT], 'hidden');
const _borders = lib.createGrid([WIDTH, HEIGHT], 'none');
/*  ˄˄˄  INIT ARRAYS  ˄˄˄  */

function App() {
    const state = useHookstate({
        bombs: _bombs,
        neighbors: _neighbors,
        statuses: _status,
        generated: false,
        cleared: [{ x: -1, y: -1 }],
        hoveredCell: { x: 0, y: 0 },
        clicking: false,
        canvas: { posX: 0, posY: 0 },
        lastCanvas: { posX: 0, posY: 0 },
    });
    const bombs = useHookstate(_bombs);
    const neighbors = useHookstate(_neighbors);
    const statuses = useHookstate(_status);
    const generated = useHookstate(false);
    const cleared = useHookstate([{ x: -1, y: -1 }]);
    const hoveredCell = useHookstate({ x: 0, y: 0 });

    const clicking = useHookstate(false);
    const canvas = useHookstate({ posX: 0, posY: 0 });
    const lastCanvas = useHookstate({ posX: 0, posY: 0 });

    const borders = React.useMemo(() => {
        statuses.get().map((row, y) =>
            row?.map((status, x) => {
                const equal = (x: number, y: number) =>
                    statuses[y][x].get() === status;

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
                            if (statuses[y + j][x + i].get() === status)
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
    }, [statuses.get()]);

    const handleClick = (
        x: number,
        y: number,
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
        e.preventDefault();
        if (!generated.get()) {
            if (e.button === 0) {
                let startStatuses: lib.SGrid = [];
                while (true) {
                    let data = handleFirstClick(x, y);

                    startStatuses = lodash.cloneDeep(data.statuses);

                    /* =====  SOLVER  ===== */
                    // setTimeout(() => {
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
                            data.bombs,
                            data.neighbors,
                            data.statuses,
                        );
                        solverOutput.bombs.forEach((e) =>
                            toggleFlag(e.x, e.y, data),
                        );
                        solverOutput.safe.forEach((e) =>
                            revealCell(e.x, e.y, data),
                        );
                    }
                    // }, 0);
                    /* =====  SOLVER  ===== */

                    var wrong: number = 0;
                    data.bombs.map((e, y) =>
                        e.map((e, x) => {
                            if (
                                e === true &&
                                data.statuses[y][x] === 'revealed'
                            ) {
                                wrong += 1;
                            }
                        }),
                    );
                    // console.error(
                    //     'Any hidden: ',
                    //     data.statuses.flat().includes('hidden'),
                    //     '  Any bombs revealed:',
                    //     !!wrong,
                    // );
                    if (!data.statuses.flat().includes('hidden') && !wrong) {
                        bombs.set(data.bombs);
                        neighbors.set(data.neighbors);
                        statuses.set(startStatuses);
                        generated.set(true);
                        break;
                    }
                }
            }
        } else {
            if (e.button === 0) {
                if (neighbors[y][x].get() === 0) clearBlank(x, y);
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
        clicking.set(true);
        lastCanvas.set(lodash.cloneDeep(canvas.get()));
    };

    const handleMouseUp = (
        x: number,
        y: number,
        e: React.MouseEvent<HTMLDivElement, MouseEvent>,
    ) => {
        if (
            clicking.get() &&
            canvas.get().posX === lastCanvas.get().posX &&
            canvas.get().posY === lastCanvas.get().posY
        ) {
            clicking.set(false);
            handleClick(x, y, e);
        }
    };

    function toggleFlag(
        x: number,
        y: number,
        data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
    ) {
        let _data = data ? data.statuses[y][x] : statuses[y][x].get();
        if (_data === 'flagged')
            data
                ? (data.statuses[y][x] = 'hidden')
                : statuses[y][x].set('hidden');
        else if (_data === 'hidden')
            data
                ? (data.statuses[y][x] = 'flagged')
                : statuses[y][x].set('flagged');
    }

    function revealCell(
        x: number,
        y: number,
        data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
    ) {
        if (data ? data.statuses[y][x] : statuses[y][x].get() === 'hidden') {
            data
                ? (data.statuses[y][x] = 'revealed')
                : statuses[y][x].set('revealed');
        }
    }

    function clearBlank(
        x: number,
        y: number,
        data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
    ) {
        let _data = data ? data.neighbors[y][x] : neighbors[y][x].get();
        if (_data !== 0 || cleared.get().find((e) => e.x === x && e.y === y))
            return;
        clearAround(x, y, data);
        checkSurroundings(x, y, data).forEach(({ x, y }) =>
            clearBlank(x, y, data),
        );
    }

    function clearAround(
        x: number,
        y: number,
        data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
    ) {
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if (
                    x + i >= 0 &&
                    x + i < WIDTH &&
                    y + j >= 0 &&
                    y + j < HEIGHT
                ) {
                    let _data = data
                        ? data.statuses[y + j][x + i]
                        : statuses[y + j][x + i].get();

                    if (_data === 'hidden')
                        data
                            ? (data.statuses[y + j][x + i] = 'revealed')
                            : statuses[y + j][x + i].set('revealed');
                }
            }
        }
        if (!cleared.get().includes({ x: x, y: y })) {
            cleared.merge([{ x: x, y: y }]);
        }
    }

    function checkSurroundings(
        x: number,
        y: number,
        data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
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
                    if (
                        (data
                            ? data.neighbors[y + j][x + i]
                            : neighbors[y + j][x + i].get()) === 0 &&
                        (i !== 0 || j !== 0)
                    )
                        emptyCells.push({ x: x + i, y: y + j });
                }
            }
        }
        return emptyCells;
    }

    const handleFirstClick = (x: number, y: number) => {
        cleared.set([{ x: -1, y: -1 }]);

        var tempBombArr = Array.from({ length: WIDTH * HEIGHT }, (_, i) =>
            i < NBOMBS ? true : false,
        );

        let pass = false;

        var neigh: lib.NGrid = lodash.cloneDeep(neighbors.value);
        var tempBombs: lib.Grid = [];
        while (!pass) {
            tempBombs = lib.unlinealiseGrid(lib.shuffle(tempBombArr), [
                WIDTH,
                HEIGHT,
            ]);

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

        let data = {
            bombs: tempBombs,
            neighbors: neigh,
            statuses: lodash.cloneDeep(statuses.value),
        };
        clearBlank(x, y, data);

        return data;
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

    return (
        <div className='App' style={{ width: '100%', height: '100%' }}>
            <div
                style={{
                    position: 'absolute',
                    width: 80,
                    // height: 60,
                    backgroundColor: 'red',
                    opacity: 0.3,
                    zIndex: 2,
                    color: 'white',
                    textAlign: 'left',
                    paddingLeft: 20,
                    paddingBlock: 10,
                }}
            >
                <span>
                    x: {hoveredCell.get().x !== -1 ? hoveredCell.get().x : '-'}
                </span>
                <br />
                <span>
                    y: {hoveredCell.get().y !== -1 ? hoveredCell.get().y : '-'}
                </span>
                <br />
                <span>
                    b:{' '}
                    {hoveredCell.get().x !== -1 && hoveredCell.get().y !== -1
                        ? borders[hoveredCell.get().y][hoveredCell.get().x]
                        : '-'}
                </span>
            </div>
            <PrismaZoom
                id='prisma-zoom'
                style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#0D151D',
                    alignItems: 'center',
                    justifyContent: 'center',
                    display: 'flex',
                    // transform: 'scale(0.2)',
                }}
                doubleTouchMaxDelay={0}
                minZoom={1}
                maxZoom={5}
                onPanChange={(e) => {
                    canvas.set(e);
                }}
            >
                <div
                    key='separator-grid'
                    id='separator-grid'
                    style={{
                        display: 'grid',
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
                    {Array.from({ length: HEIGHT }, () =>
                        Array.from({ length: WIDTH }, () => 0),
                    ).map((row, y) =>
                        row?.map((bomb, x) => (
                            <div
                                style={{
                                    position: 'relative',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                {x > 0 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            width: SEP_WIDTH,
                                            left: -SEP_WIDTH / 2,
                                            height: SEP_HEIGHT,
                                            backgroundColor: SEP_COLOR,
                                            borderRadius: SEP_WIDTH / 2,
                                        }}
                                    />
                                )}
                                {y > 0 && (
                                    <div
                                        style={{
                                            position: 'absolute',
                                            width: SEP_HEIGHT,
                                            top: -SEP_WIDTH / 2,
                                            height: SEP_WIDTH,
                                            backgroundColor: SEP_COLOR,
                                            borderRadius: SEP_WIDTH / 2,
                                        }}
                                    />
                                )}
                            </div>
                        )),
                    )}
                </div>
                <div
                    key='grid'
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
                    {bombs.get().map((row, y) =>
                        row?.map((bomb, x) => (
                            <div
                                key={`${x}-${y}`}
                                id={`${x}-${y}`}
                                style={{
                                    // backgroundColor: '#0D151D',
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
                                    hoveredCell.set({ x: x, y: y })
                                }
                                onMouseLeave={(e) =>
                                    hoveredCell.set({ x: -1, y: -1 })
                                }
                                // ref={componentRef}
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
                                                }[statuses[y][x].get()]
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
                                                            {neighbors[y][
                                                                x
                                                            ].get() > 0 &&
                                                                neighbors[y][
                                                                    x
                                                                ].get()}
                                                        </text>
                                                    ),
                                                }[statuses[y][x].get()]
                                            }
                                            {hoveredCell.get().x === x &&
                                                hoveredCell.get().y === y && (
                                                    <path
                                                        fill={
                                                            {
                                                                hidden: '#0004',
                                                                flagged:
                                                                    '#0004',
                                                                revealed:
                                                                    '#fff2',
                                                            }[
                                                                statuses[y][
                                                                    x
                                                                ].get()
                                                            ]
                                                        }
                                                        d='M83.5,8.25H16.5c-4.56,0-8.25,3.69-8.25,8.25V83.5c0,4.56,3.69,8.25,8.25,8.25H83.5c4.56,0,8.25-3.69,8.25-8.25V16.5c0-4.56-3.69-8.25-8.25-8.25Z'
                                                    />
                                                )}
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
