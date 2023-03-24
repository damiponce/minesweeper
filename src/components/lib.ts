import { useEffect, useState } from 'react';
import * as vec from 'vectorious';
var lodash = require('lodash');

export type Grid = boolean[][];
export type NGrid = number[][];
export type SGrid = string[][];
export type GridSize = [number, number];

export function createGrid([width, height]: GridSize): Grid {
    const grid = new Array(height)
        .fill(0)
        .map(() => new Array(width).fill(false));
    return grid;
}

export function linealiseGrid(grid: Grid): boolean[] {
    return grid.reduce((acc, row) => [...acc, ...row], []);
}

export function unlinealiseGrid(
    grid: boolean[],
    [width, height]: GridSize,
): Grid {
    return new Array(height)
        .fill(0)
        .map((_, i) => grid.slice(i * width, (i + 1) * width));
}

export function shuffle(array: boolean[]) {
    var m = array.length,
        t,
        i;

    // While there remain elements to shuffle…
    while (m) {
        // Pick a remaining element…
        i = Math.floor(Math.random() * m--);

        // And swap it with the current element.
        t = array[m];
        array[m] = array[i];
        array[i] = t;
    }

    return array;
}

export function iterate(
    grid: NGrid,
    fn: (x: number, y: number, value: number) => void,
) {
    grid.forEach((row, y) => {
        row.forEach((cell, x) => {
            fn(x, y, cell);
        });
    });
}

export const useContainerDimensions = (myRef: any) => {
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const getDimensions = () => ({
            width: myRef.current.offsetWidth,
            height: myRef.current.offsetHeight,
        });

        const handleResize = () => {
            setDimensions(getDimensions());
        };

        if (myRef.current) {
            setDimensions(getDimensions());
        }

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, [myRef]);

    return dimensions;
};

export function solver(
    [_width, _height]: [number, number],
    _bombs: Grid,
    _neighbors: NGrid,
    _statuses: SGrid,
) {
    // console.log(_width, _height, _bombs, _neighbors, _statuses);

    var rowList: { x: number; y: number; n: { x: number; y: number }[] }[] = [];
    var rowNs: number[][] = [];

    let _knownBombCols: number[] = [];
    let _knownSafeCols: number[] = [];

    let bombs: { x: number; y: number }[] = [];
    let safe: { x: number; y: number }[] = [];

    var neigh = lodash.cloneDeep(_neighbors);

    _statuses.map((_row, y) =>
        _row?.map((status, x) => {
            if (status === 'revealed' && _bombs[y][x] === false) {
                var select = [];
                for (var i = -1; i <= 1; i++) {
                    for (var j = -1; j <= 1; j++) {
                        if (
                            x + i >= 0 &&
                            x + i < _width &&
                            y + j >= 0 &&
                            y + j < _height &&
                            !(i === 0 && j === 0)
                        ) {
                            if (_statuses[y + j][x + i] === 'hidden') {
                                select.push({ x: x + i, y: y + j });
                            } else if (_statuses[y + j][x + i] === 'flagged') {
                                neigh[y][x] = neigh[y][x] - 1;
                            }
                        }
                    }
                }
                if (select.length > 0) {
                    rowList.push({ x, y, n: select });
                    rowNs.push([neigh[y][x]]);
                }
                if (neigh[y][x] === 0) {
                    select.map(({ x, y }) => {
                        safe.push({ x, y });
                    });
                }
            }
        }),
    );

    var colList: { x: number; y: number }[] = [];

    rowList.map(({ x, y }, i) => {
        for (var i = -1; i <= 1; i++) {
            for (var j = -1; j <= 1; j++) {
                if (
                    x + i >= 0 &&
                    x + i < _width &&
                    y + j >= 0 &&
                    y + j < _height &&
                    !(i === 0 && j === 0)
                ) {
                    if (_statuses[y + j][x + i] === 'hidden') {
                        if (
                            !colList.find((e) => e.x === x + i && e.y === y + j)
                        ) {
                            colList.push({ x: x + i, y: y + j });
                        }
                    }
                }
            }
        }
    });

    // console.warn(rowList);
    // console.warn(colList);

    let m = new vec.NDArray(
        Array.from({ length: rowList.length }, () =>
            Array.from({ length: colList.length + 1 }, () => 0),
        ),
        { shape: [rowList.length, colList.length + 1], dtype: 'int32' },
    ).toArray();

    m = m.map((row: number[], r: number) => {
        return row.map((_: any, i: number) => {
            if (i === colList.length) {
                const nCell = { x: rowList[0].x, y: rowList[0].y };
                return rowNs[r][0];
            } else {
                const nNeigh = rowList[r].n.find(
                    (e) => e.x === colList[i].x && e.y === colList[i].y,
                );
                return nNeigh ? 1 : 0;
            }
        });
    });
    // console.table(
    //     new vec.NDArray(m, {
    //         shape: [rowList.length, colList.length + 1],
    //         dtype: 'int32',
    //     })
    //         .transpose()
    //         .toArray(),
    // );

    let finalM = new vec.NDArray(m, {
        shape: [rowList.length, colList.length + 1],
        dtype: 'int32',
    }).gauss();

    finalM
        .toArray()
        .slice(0)
        .reverse()
        .map((row: number[], r: number) => {
            let aug = row.pop();
            let ones = row
                .map((e: number, i: number) => (e === 1 ? i : -1))
                .filter((x) => x !== -1);
            let negOnes = row
                .map((e: number, i: number) => (e === -1 ? i : -1))
                .filter((x) => x !== -1);

            // console.warn(row, aug, ones, negOnes);

            if (aug === 1 && ones.length === 1 && negOnes.length === 0) {
                let colIndex = row.findIndex((e: number) => e === 1);
                if (!_knownBombCols.includes(colIndex)) {
                    _knownBombCols.push(colIndex);
                }
            } else if (aug === 0 && negOnes.length === 0) {
                ones.map((e) => {
                    if (!_knownSafeCols.includes(e)) {
                        _knownSafeCols.push(e);
                    }
                });
            } else if (aug === -negOnes.length) {
                negOnes.map((e) => {
                    if (!_knownBombCols.includes(e)) {
                        _knownBombCols.push(e);
                    }
                });
                ones.map((e) => {
                    if (!_knownSafeCols.includes(e)) {
                        _knownSafeCols.push(e);
                    }
                });
            } else if (aug === ones.length) {
                ones.map((e) => {
                    if (!_knownBombCols.includes(e)) {
                        _knownBombCols.push(e);
                    }
                });
                negOnes.map((e) => {
                    if (!_knownSafeCols.includes(e)) {
                        _knownSafeCols.push(e);
                    }
                });
            } else if (aug === 0 && ones.length > 0 && negOnes.length === 0) {
                ones.map((e) => {
                    if (!_knownSafeCols.includes(e)) {
                        _knownSafeCols.push(e);
                    }
                });
            } else if (aug === 0 && ones.length === 0 && negOnes.length > 0) {
                negOnes.map((e) => {
                    if (!_knownSafeCols.includes(e)) {
                        _knownSafeCols.push(e);
                    }
                });
            }
        });

    // Set the maximum bound and minimum bound to zero
    // For each column in the row (not including the augmented column of course) if the number is positive add it to the maximum bound and if it is negative then add it to the minimum bound.
    // If the augmented column value is equal to the minimum bound then
    //    All of the negative numbers in that row are mines and all of the positive values in that row are not mines
    // else if the augmented column value is equal to the maximum bound then
    //    All of the negative numbers in that row are not mines and all of the positive values in that row are mines.

    // console.table(finalM.transpose().toArray());

    // console.log('\n\nBombs');
    // console.table(_knownBombCols.map((e) => colList[e]));
    // console.log('Safe');
    // console.table(
    //     _knownSafeCols.map((e) => colList[e]),
    //     ['x', 'y'],
    // );

    bombs.push(..._knownBombCols.map((e) => colList[e]));
    safe.push(
        ..._knownSafeCols
            .map((e) =>
                safe.findIndex(
                    (f) => f.x === colList[e].x && f.y === colList[e].y,
                ) === -1
                    ? colList[e]
                    : { x: -69, y: -69 },
            )
            .filter((e) => e.x !== -69 && e.y !== -69),
    );

    console.log('finished');

    return { bombs, safe };
}
