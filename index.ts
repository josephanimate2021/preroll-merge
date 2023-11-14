const ffmpeg = require('fluent-ffmpeg');
const { promises: fsPromises } = require('fs');
const { basename, join } = require('path');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath = require('@ffprobe-installer/ffprobe').path;
const FOLDERS = {
    PREROLL: './node_modules/preroll-merge/preroll',
    INPUT: './node_modules/preroll-merge/input',
    OUTPUT: './node_modules/preroll-merge/output',
    TEMP: './node_modules/preroll-merge/temp'
};
const ERRORS = {
    PREROLL: 'Please add a preroll video to the preroll folder',
    INPUT: 'Please add an input video to the input folder'
};

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

function isNil(obj) {
    return obj === null || typeof obj === 'undefined';
}

function isEmpty(obj) {
    return obj === '' || isNil(obj);
}

function isObject(obj) {
    return obj != null && typeof obj === 'object';
}

function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
}

function onError(err) {
    if (isObject(err)) {
        console.error(`Error: ${err.message}`, '\n');
    } else {
        console.error(err, '\n');
    }

    process.exitCode = 1;
}

function merge(prePath, inputPath) {
    return new Promise((resolve, reject) => {
        const inputName = basename(inputPath);

        ffmpeg(prePath)
            .input(inputPath)
            .on('error', e => {
                console.log(e);
                resolve({
                    success: false,
                    msg: 'Internal Server Error'
                });
            })
            .on('start', () => {
                console.log(`Starting merge for ${inputName}`);
            })
            .on('end', () => {
                console.log(`${inputName} merged!`);
                resolve({
                    success: true,
                    path: join(FOLDERS.OUTPUT, inputName)
                });
            })
            .mergeToFile(join(FOLDERS.OUTPUT, inputName), FOLDERS.TEMP);
    });
}

module.exports = async function(callback) {
    try {
        const prerollFiles = await fsPromises.readdir(FOLDERS.PREROLL);

        if (!isArray(prerollFiles) || prerollFiles.length === 0) {
            throw new Error(ERRORS.PREROLL);
        }

        let preroll;

        for (const p of prerollFiles) {
            const apPath = join(FOLDERS.PREROLL, p);
            const stat = await fsPromises.stat(apPath);

            if (!stat.isDirectory()) {
                preroll = apPath;
                break;
            }
        }

        if (isEmpty(preroll)) {
            throw new Error(ERRORS.PREROLL);
        }

        const inputFiles = await fsPromises.readdir(FOLDERS.INPUT);

        if (!isArray(inputFiles) || inputFiles.length === 0) {
            throw new Error(ERRORS.INPUT);
        }

        for (const i of inputFiles) {
            const iPath = join(FOLDERS.INPUT, i);
            const stat = await fsPromises.stat(iPath);

            if (!stat.isDirectory() && typeof callback == "function") callback(await merge(preroll, iPath));
        }
    } catch (e) {
        onError(e);
    }
}
