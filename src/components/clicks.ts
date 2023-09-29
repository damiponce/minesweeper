import { globalState, globalSettings } from './../App';
import * as lib from './lib';
var lodash = require('lodash');

export const handleClick = (
    x: number,
    y: number,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
) => {
    const state = globalState;
    const settings = globalSettings;

    e.preventDefault();
    if (!state.generated.get()) {
        if (e.button === (settings.switchClicks.get() ? 2 : 0)) {
            let startStatuses: lib.SGrid = [];
            while (true) {
                let data = handleFirstClick(x, y);

                startStatuses = lodash.cloneDeep(data.statuses);

                /*  ˅˅˅  SOLVER  ˅˅˅  */
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
                        [settings.width.get(), settings.height.get()],
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
                /*  ˄˄˄  SOLVER  ˄˄˄  */

                var wrong: number = 0;
                data.bombs.map((e, y) =>
                    e.map((e, x) => {
                        if (e === true && data.statuses[y][x] === 'revealed') {
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
                    state.bombs.set(data.bombs);
                    state.neighbors.set(data.neighbors);
                    state.statuses.set(startStatuses);
                    state.generated.set(true);
                    break;
                }
            }
        }
    } else {
        if (e.button === (settings.switchClicks.get() ? 2 : 0)) {
            if (state.neighbors[y][x].get() === 0) clearBlank(x, y);
            else revealCell(x, y);
        } else if (e.button === 1) {
            clearTrivial(x, y);
        } else if (e.button === (settings.switchClicks.get() ? 0 : 2)) {
            toggleFlag(x, y);
        }
    }
};

export const handleMouseDown = (
    x: number,
    y: number,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
) => {
    const state = globalState;
    const settings = globalSettings;

    console.log(e.button);

    state.clicking.set(true);
    state.lastCanvas.set(lodash.cloneDeep(state.canvas.get()));
};

export const handleMouseUp = (
    x: number,
    y: number,
    e: React.MouseEvent<HTMLDivElement, MouseEvent>,
) => {
    const state = globalState;
    const settings = globalSettings;

    if (
        state.clicking.get() &&
        state.canvas.get().posX === state.lastCanvas.get().posX &&
        state.canvas.get().posY === state.lastCanvas.get().posY
    ) {
        state.clicking.set(false);
        handleClick(x, y, e);
    }
};

export function toggleFlag(
    x: number,
    y: number,
    data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
) {
    const state = globalState;
    const settings = globalSettings;

    let _data = data ? data.statuses[y][x] : state.statuses[y][x].get();
    if (_data === 'flagged')
        data
            ? (data.statuses[y][x] = 'hidden')
            : state.statuses[y][x].set('hidden');
    else if (_data === 'hidden')
        data
            ? (data.statuses[y][x] = 'flagged')
            : state.statuses[y][x].set('flagged');
}

export function revealCell(
    x: number,
    y: number,
    data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
) {
    const state = globalState;
    const settings = globalSettings;

    if (data ? data.statuses[y][x] : state.statuses[y][x].get() === 'hidden') {
        data
            ? (data.statuses[y][x] = 'revealed')
            : state.statuses[y][x].set('revealed');
    }
}

export function clearBlank(
    x: number,
    y: number,
    data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
) {
    const state = globalState;
    const settings = globalSettings;

    let _data = data ? data.neighbors[y][x] : state.neighbors[y][x].get();
    if (_data !== 0 || state.cleared.get().find((e) => e.x === x && e.y === y))
        return;
    clearAround(x, y, data);
    checkSurroundings(x, y, data).forEach(({ x, y }) => clearBlank(x, y, data));
}

export function clearAround(
    x: number,
    y: number,
    data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
) {
    const state = globalState;
    const settings = globalSettings;

    for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
            if (
                x + i >= 0 &&
                x + i < settings.width.get() &&
                y + j >= 0 &&
                y + j < settings.height.get()
            ) {
                let _data = data
                    ? data.statuses[y + j][x + i]
                    : state.statuses[y + j][x + i].get();

                if (_data === 'hidden')
                    data
                        ? (data.statuses[y + j][x + i] = 'revealed')
                        : state.statuses[y + j][x + i].set('revealed');
            }
        }
    }
    if (!state.cleared.get().includes({ x: x, y: y })) {
        state.cleared.merge([{ x: x, y: y }]);
    }
}

export function checkSurroundings(
    x: number,
    y: number,
    data?: { bombs: lib.Grid; neighbors: lib.NGrid; statuses: lib.SGrid },
): { x: number; y: number }[] {
    const state = globalState;
    const settings = globalSettings;

    var emptyCells: { x: number; y: number }[] = [];
    for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
            if (
                x + i >= 0 &&
                x + i < settings.width.get() &&
                y + j >= 0 &&
                y + j < settings.height.get()
            ) {
                if (
                    (data
                        ? data.neighbors[y + j][x + i]
                        : state.neighbors[y + j][x + i].get()) === 0 &&
                    (i !== 0 || j !== 0)
                )
                    emptyCells.push({ x: x + i, y: y + j });
            }
        }
    }
    return emptyCells;
}

export const handleFirstClick = (x: number, y: number) => {
    const state = globalState;
    const settings = globalSettings;

    state.cleared.set([{ x: -1, y: -1 }]);

    var tempBombArr = Array.from(
        { length: settings.width.get() * settings.height.get() },
        (_, i) => (i < settings.nBombs.get() ? true : false),
    );

    let pass = false;

    var neigh: lib.NGrid = lodash.cloneDeep(state.neighbors.value);
    var tempBombs: lib.Grid = [];
    while (!pass) {
        tempBombs = lib.unlinealiseGrid(lib.shuffle(tempBombArr), [
            settings.width.get(),
            settings.height.get(),
        ]);

        for (var m = 0; m < settings.width.get(); m++) {
            for (var n = 0; n < settings.height.get(); n++) {
                var sum = 0;
                for (var i = -1; i <= 1; i++) {
                    for (var j = -1; j <= 1; j++) {
                        if (
                            m + i >= 0 &&
                            m + i < settings.width.get() &&
                            n + j >= 0 &&
                            n + j < settings.height.get()
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
        statuses: lodash.cloneDeep(state.statuses.value),
    };
    clearBlank(x, y, data);

    return data;
};

export function clearTrivial(x: number, y: number) {
    const state = globalState;
    const settings = globalSettings;

    if (state.statuses[y][x].get() !== 'revealed') return;
    var cleanCells: { x: number; y: number }[] = [];
    var flaggedCells: number = 0;
    for (var i = -1; i <= 1; i++) {
        for (var j = -1; j <= 1; j++) {
            if (
                x + i >= 0 &&
                x + i < settings.width.get() &&
                y + j >= 0 &&
                y + j < settings.height.get() &&
                !(i === 0 && j === 0)
            ) {
                if (state.statuses[y + j][x + i].get() === 'flagged') {
                    flaggedCells++;
                } else if (state.statuses[y + j][x + i].get() === 'hidden') {
                    cleanCells.push({ x: x + i, y: y + j });
                }
            }
        }
    }
    if (flaggedCells === state.neighbors[y][x].get()) {
        cleanCells.forEach((e) =>
            state.neighbors[e.y][e.x].get() === 0
                ? clearBlank(e.x, e.y)
                : revealCell(e.x, e.y),
        );
    }
}
