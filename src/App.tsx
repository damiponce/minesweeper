/*  ˅˅˅  IMPORTS  ˅˅˅  */
import React from 'react';
import './App.scss';
import PrismaZoom from 'react-prismazoom';
import * as lib from './components/lib';
import {
    handleClick,
    handleMouseDown,
    handleMouseUp,
    toggleFlag,
    revealCell,
    clearAround,
    clearBlank,
    checkSurroundings,
} from './components/clicks';
import { svgs } from './components/svgs';
import { hookstate, useHookstate, State, extend } from '@hookstate/core';
import { subscribable } from '@hookstate/subscribable';
import { devtools } from '@hookstate/devtools';
var lodash = require('lodash');
/*  ˄˄˄  IMPORTS  ˄˄˄  */

/*  ˅˅˅  CONSTANTS  ˅˅˅  */
const WIDTH = 5;
const HEIGHT = 5;
const SCALE = 0.5;
const PERCENTAGE = 0.1; //0.3
// export const NBOMBS = Math.round(WIDTH * HEIGHT * PERCENTAGE); // 20% of WIDTH * HEIGHT
const SEP_WIDTH: number = 8; // better if even number
const SEP_HEIGHT: string = '60%';
const SEP_COLOR: string = '#384751';
/*  ˄˄˄  CONSTANTS  ˄˄˄  */

/*  ˅˅˅  INIT ARRAYS  ˅˅˅  */
const INIT_DATA = {
    bombs: lib.createGrid([5, 5], false),
    neighbors: lib.createGrid([5, 5], 0),
    statuses: lib.createGrid([5, 5], 'hidden'),
    borders: lib.createGrid([5, 5], 'none'),
    generated: false,
    cleared: [{ x: -1, y: -1 }],
    hoveredCell: { x: -1, y: -1 },
    clicking: false,
    canvas: { posX: 0, posY: 0 },
    lastCanvas: { posX: 0, posY: 0 },
    bombsLeft: 5,
    gameOver: false,
    gameWon: false,
};

const difficulties = ['Easy', 'Medium', 'Hard', 'Extreme', 'Custom']; // indices correspond to difficulty

const INIT_SETTINGS = {
    difficulty: 0,
    width: 5,
    height: 5,
    nBombs: 5,
    playing: false,
};
/*  ˄˄˄  INIT ARRAYS  ˄˄˄  */

/*  ˅˅˅  STATES  ˅˅˅  */
export const globalState = hookstate(
    lodash.cloneDeep(INIT_DATA) as typeof INIT_DATA,
    extend(subscribable(), devtools({ key: 'state' })),
);

export const globalSettings = hookstate(
    lodash.cloneDeep(INIT_SETTINGS) as typeof INIT_SETTINGS,
    extend(subscribable(), devtools({ key: 'settings' })),
);
/*  ˄˄˄  STATES  ˄˄˄  */

/*  ˅˅˅  MAIN FUNCTION  ˅˅˅  */
function App() {
    const state = useHookstate(globalState);
    const settings = useHookstate(globalSettings);

    const borders = React.useMemo(() => {
        state.statuses.get().map((row, y) =>
            row?.map((status, x) => {
                const equal = (x: number, y: number) =>
                    state.statuses[y][x].get() === status;

                var equalsAround = [];

                for (var i = -1; i <= 1; i++) {
                    for (var j = -1; j <= 1; j++) {
                        if (
                            x + i >= 0 &&
                            x + i < row.length &&
                            y + j >= 0 &&
                            y + j < state.statuses.get().length &&
                            !(i === 0 && j === 0)
                        ) {
                            if (state.statuses[y + j][x + i].get() === status)
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

                state.borders[y][x].set(JSON.stringify(equalsAround));
            }),
        );
        return state.borders.get();
    }, [state.statuses.get()]);

    function initState() {
        console.error('initState');

        state.set({
            bombs: lodash.cloneDeep(
                lib.createGrid(
                    [settings.width.get(), settings.height.get()],
                    false,
                ),
            ),
            neighbors: lodash.cloneDeep(
                lib.createGrid(
                    [settings.width.get(), settings.height.get()],
                    0,
                ),
            ),
            statuses: lodash.cloneDeep(
                lib.createGrid(
                    [settings.width.get(), settings.height.get()],
                    'hidden',
                ),
            ),
            borders: lodash.cloneDeep(
                lib.createGrid(
                    [settings.width.get(), settings.height.get()],
                    'none',
                ),
            ),
            generated: false,
            cleared: [{ x: -1, y: -1 }],
            hoveredCell: { x: -1, y: -1 },
            clicking: false,
            canvas: { posX: 0, posY: 0 },
            lastCanvas: { posX: 0, posY: 0 },
            bombsLeft: settings.nBombs.get(),
            gameOver: false,
            gameWon: false,
        } as typeof INIT_DATA);
    }

    React.useEffect(() => {
        switch (settings.difficulty.get()) {
            case 0:
                settings.width.set(5);
                settings.height.set(5);
                settings.nBombs.set(5);
                break;
            case 1:
                settings.width.set(10);
                settings.height.set(10);
                settings.nBombs.set(20);
                break;
            case 2:
                settings.width.set(15);
                settings.height.set(15);
                settings.nBombs.set(50);
                break;
            case 3:
                settings.width.set(20);
                settings.height.set(20);
                settings.nBombs.set(100);
                break;
            case 4:
                settings.width.set(30);
                settings.height.set(30);
                settings.nBombs.set(300);
                break;
            default:
                settings.width.set(10);
                settings.height.set(10);
                settings.nBombs.set(20);
        }
    }, [settings.difficulty.get()]);

    React.useEffect(() => {
        initState();
    }, [settings.width.get()]);

    React.useEffect(() => {
        const handleContextMenu = (e: any) => {
            e.preventDefault();
        };
        document.addEventListener('contextmenu', handleContextMenu);
        return () => {
            document.removeEventListener('contextmenu', handleContextMenu);
        };
    }, []);

    React.useEffect(
        () =>
            state.statuses.subscribe(
                (s) => (
                    state.statuses.get().map((row, y) =>
                        row.map((status, x) => {
                            if (
                                status === 'revealed' &&
                                state.bombs[y][x].get()
                            ) {
                                state.statuses[y][x].set('exploded');
                                state.hoveredCell.set({ x: -1, y: -1 });
                                state.gameOver.set(true);
                            }
                        }),
                    ),
                    state.statuses
                        .get()
                        .flat()
                        .filter((e) => e === 'revealed').length ===
                        settings.width.get() * settings.height.get() -
                            settings.nBombs.get() &&
                        (state.hoveredCell.set({ x: -1, y: -1 }),
                        state.gameWon.set(true)),
                    state.bombsLeft.set(
                        settings.nBombs.get() -
                            state.statuses
                                .get()
                                .flat()
                                .filter((e) => e === 'flagged').length,
                    )
                ),
            ),
        [],
    );

    let matchEnded = state.gameOver.get() || state.gameWon.get();
    let playable = !matchEnded;

    return (
        <div className='App' style={{ width: '100%', height: '100%' }}>
            <div
                hidden
                style={{
                    position: 'absolute',
                    left: 8,
                    top: 58,
                    width: 80,
                    // height: 60,
                    backgroundColor: 'red',
                    opacity: 0.3,
                    zIndex: 2,
                    color: 'white',
                    textAlign: 'left',
                    padding: 10,
                    border: '1px solid #0000',
                }}
            >
                <span>
                    x:{' '}
                    {state.hoveredCell.get().x !== -1
                        ? state.hoveredCell.get().x
                        : '-'}
                </span>
                <br />
                <span>
                    y:{' '}
                    {state.hoveredCell.get().y !== -1
                        ? state.hoveredCell.get().y
                        : '-'}
                </span>
                <br />
                <span>
                    b:{' '}
                    {state.hoveredCell.get().x !== -1 &&
                    state.hoveredCell.get().y !== -1
                        ? borders[state.hoveredCell.get().y][
                              state.hoveredCell.get().x
                          ]
                        : '-'}
                </span>
            </div>

            <div className='counter'>
                <span>{state.bombsLeft.get()} bombs left</span>
            </div>

            <div className='hamburger'>
                <svg fill='#fff' viewBox='0 0 28 28'>
                    <path
                        id='Vector'
                        d='M 7 19 H 21 M 7 14 H 21 M 7 9 H 21'
                        stroke='#41A3CD99'
                        strokeWidth='1'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                    />
                </svg>
            </div>

            <div className='hamburger-dropdown'>
                <span
                    style={{ margin: 10, cursor: 'pointer' }}
                    onClick={initState}
                >
                    Reset
                </span>
            </div>

            {matchEnded && (
                <>
                    <div className='end-game-alert'>
                        {state.gameOver.get() && <span>YOU LOST</span>}
                        {state.gameWon.get() && <span>YOU WON</span>}
                    </div>
                </>
            )}

            {!settings.playing.get() && (
                <div className='main-menu'>
                    <h1>MINESWEEPER</h1>
                    <div className='diff-section'>
                        <h3>Difficulty</h3>
                        <div className='diff-selector'>
                            <span
                                style={{
                                    gridArea: 'left',
                                    width: 30,
                                    height: 30,
                                    userSelect: 'none',
                                    cursor: 'pointer',
                                    pointerEvents:
                                        settings.difficulty.get() === 0
                                            ? 'none'
                                            : 'auto',
                                }}
                                onClick={() =>
                                    settings.difficulty.set((p) => p - 1)
                                }
                            >
                                {`<`}
                            </span>
                            <span style={{ gridArea: 'diff' }}>
                                {difficulties[settings.difficulty.get()]}
                            </span>
                            <span
                                style={{
                                    gridArea: 'right',
                                    width: 30,
                                    height: 30,
                                    userSelect: 'none',
                                    cursor: 'pointer',
                                    pointerEvents:
                                        settings.difficulty.get() ===
                                        difficulties.length - 1
                                            ? 'none'
                                            : 'auto',
                                }}
                                onClick={() =>
                                    settings.difficulty.set((p) => p + 1)
                                }
                            >
                                {`>`}
                            </span>
                        </div>
                    </div>
                    <span
                        className='start-btn'
                        onClick={() => settings.playing.set(true)}
                    >
                        START
                    </span>
                </div>
            )}

            {settings.playing.get() &&
                (state.gameOver.get() || state.gameWon.get()) && (
                    <div className='main-menu'>
                        <h1>Leaderboard</h1>
                        <span>Coming soon...</span>
                        <span
                            className='start-btn'
                            onClick={() => (
                                settings.playing.set(false), initState()
                            )}
                        >
                            Play again
                        </span>
                    </div>
                )}

            <div
                className='blur'
                style={{
                    backgroundColor: !settings.playing.get()
                        ? '#275C75'
                        : '#0000',
                    backdropFilter:
                        matchEnded || !settings.playing.get()
                            ? 'blur(20px)'
                            : 'none',
                    pointerEvents:
                        matchEnded || !settings.playing.get() ? 'auto' : 'none',
                }}
            />

            <PrismaZoom
                id='prisma-zoom'
                className='zoom-canvas'
                doubleTouchMaxDelay={0}
                minZoom={1}
                maxZoom={5}
                onPanChange={(e) => {
                    state.canvas.set(e);
                }}
            >
                <div
                    key='separator-grid'
                    id='separator-grid'
                    className='separator-grid'
                    style={{
                        display: 'grid',
                        gridTemplateColumns: `repeat(${settings.width.get()}, 1fr)`,
                        gridTemplateRows: `repeat(${settings.height.get()}, 1fr)`,
                        aspectRatio:
                            settings.width.get() / settings.height.get(),
                        maxWidth:
                            (Math.min(window.innerWidth, window.innerHeight) -
                                24) *
                            5,
                        maxHeight:
                            (Math.min(window.innerWidth, window.innerHeight) -
                                24) *
                            5,
                        width:
                            settings.width.get() / settings.height.get() >= 1
                                ? `calc(100% * 5)`
                                : 'auto',
                        height:
                            settings.width.get() / settings.height.get() < 1
                                ? `calc(100% * 5)`
                                : 'auto',
                        margin: 0,
                        position: 'absolute',
                        transform: `scale3d(0.2,0.2,1)`,
                    }}
                >
                    {Array.from({ length: settings.height.get() }, () =>
                        Array.from({ length: settings.width.get() }, () => 0),
                    ).map((row, y) =>
                        row?.map((bomb, x) => (
                            <div
                                key={`${x}-${y}`}
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
                        gridTemplateColumns: `repeat(${settings.width.get()}, 1fr)`,
                        gridTemplateRows: `repeat(${settings.height.get()}, 1fr)`,
                        aspectRatio:
                            settings.width.get() / settings.height.get(),
                        maxWidth:
                            (Math.min(window.innerWidth, window.innerHeight) -
                                24) *
                            5,
                        maxHeight:
                            (Math.min(window.innerWidth, window.innerHeight) -
                                24) *
                            5,
                        width:
                            settings.width.get() / settings.height.get() >= 1
                                ? `calc(100% * 5)`
                                : 'auto',
                        height:
                            settings.width.get() / settings.height.get() < 1
                                ? `calc(100% * 5)`
                                : 'auto',
                        margin: 0,
                        position: 'absolute',
                        transform: `scale3d(0.2,0.2,1)`,
                    }}
                >
                    {state.bombs.get().map((row, y) =>
                        row?.map((bomb, x) => (
                            <div
                                key={`${x}-${y}`}
                                id={`${x}-${y}`}
                                className='cell'
                                onMouseDown={(e) =>
                                    playable && handleMouseDown(x, y, e)
                                }
                                onMouseUp={(e) =>
                                    playable && handleMouseUp(x, y, e)
                                }
                                onMouseEnter={(e) =>
                                    playable &&
                                    state.hoveredCell.set({ x: x, y: y })
                                }
                                onMouseLeave={(e) =>
                                    playable &&
                                    state.hoveredCell.set({ x: -1, y: -1 })
                                }
                                // ref={componentRef}
                            >
                                {
                                    // <div
                                    //     className='hidden_cell'
                                    //     style={{
                                    //         position: 'absolute',
                                    //         width: '100%',
                                    //         height: '100%',

                                    //         zIndex: 69,
                                    //     }}
                                    // >
                                    <svg
                                        viewBox='0 0 100 100'
                                        style={{
                                            position: 'absolute',
                                            width: '100%',
                                            height: '100%',

                                            // zIndex: 69,
                                        }}
                                        fill={
                                            {
                                                hidden: '#41A3CD',
                                                flagged: '#808F9E',
                                                revealed: '#0000',
                                            }[state.statuses[y][x].get()]
                                        }
                                    >
                                        {
                                            {
                                                hidden: (
                                                    <g>
                                                        {
                                                            (svgs as any)[
                                                                borders[y][x]
                                                            ]
                                                        }
                                                        {state.gameOver.get() &&
                                                        state.bombs[y][
                                                            x
                                                        ].get() ? (
                                                            <circle
                                                                fill='#111'
                                                                cx='50'
                                                                cy='50'
                                                                r='22'
                                                            />
                                                        ) : null}
                                                    </g>
                                                ),
                                                flagged: (
                                                    <g>
                                                        {
                                                            (svgs as any)[
                                                                borders[y][x]
                                                            ]
                                                        }
                                                        {state.gameOver.get() &&
                                                        state.bombs[y][
                                                            x
                                                        ].get() ? (
                                                            <circle
                                                                fill='#111'
                                                                cx='50'
                                                                cy='50'
                                                                r='22'
                                                            />
                                                        ) : (
                                                            <path
                                                                d='M67.522,33.975H56.132l-0.487-2.481c-0.303-1.543-1.655-2.656-3.228-2.656H34.734c-1.47,0-2.661,1.191-2.661,2.661v37.714h0 c0,0.001,0,0.001,0,0.002c0,1.474,1.195,2.67,2.67,2.67s2.67-1.195,2.67-2.67c0-0.001,0-0.001,0-0.002h0V54.457h13.81l0.53,2.475 c0.325,1.517,1.665,2.601,3.216,2.601h12.554c1.47,0,2.661-1.191,2.661-2.661V36.636C70.183,35.167,68.992,33.975,67.522,33.975z'
                                                                fill='#000'
                                                            />
                                                        )}
                                                    </g>
                                                ),
                                                revealed: (
                                                    <text
                                                        x='50%'
                                                        y='50%'
                                                        textAnchor='middle'
                                                        dominantBaseline='middle'
                                                        style={{
                                                            fontSize: '250%',
                                                            fontWeight: 'bold',
                                                            color: '#ddd',
                                                            textAlign: 'center',
                                                            zIndex: 10,
                                                        }}
                                                        fill='#ddd'
                                                    >
                                                        {state.neighbors[y][
                                                            x
                                                        ].get() > 0 &&
                                                            state.neighbors[y][
                                                                x
                                                            ].get()}
                                                    </text>
                                                ),
                                                exploded: (
                                                    <g fill='red'>
                                                        {
                                                            (svgs as any)[
                                                                borders[y][x]
                                                            ]
                                                        }
                                                        <circle
                                                            fill='#eee'
                                                            cx='50'
                                                            cy='50'
                                                            r='22'
                                                        />
                                                    </g>
                                                ),
                                            }[state.statuses[y][x].get()]
                                        }
                                        {state.hoveredCell.get().x === x &&
                                            state.hoveredCell.get().y === y && (
                                                <path
                                                    fill={
                                                        {
                                                            hidden: '#0004',
                                                            flagged: '#0004',
                                                            revealed: '#fff2',
                                                            exploded: '#fff2',
                                                        }[
                                                            state.statuses[y][
                                                                x
                                                            ].get()
                                                        ]
                                                    }
                                                    d='M83.5,8.25H16.5c-4.56,0-8.25,3.69-8.25,8.25V83.5c0,4.56,3.69,8.25,8.25,8.25H83.5c4.56,0,8.25-3.69,8.25-8.25V16.5c0-4.56-3.69-8.25-8.25-8.25Z'
                                                />
                                            )}
                                    </svg>
                                    // </div>
                                }
                            </div>
                        )),
                    )}
                </div>
            </PrismaZoom>
        </div>
    );
}
/*  ˄˄˄  MAIN FUNCTION  ˄˄˄  */

export default App;
