'use strict';

const path = require('path');

const through2 = require('through2');
const gutil = require('gulp-util');
const PluginError = gutil.PluginError;

function newFile(originalFile, filename, fileContents){
    return new gutil.File({
        base: originalFile.base,
        contents: new Buffer(fileContents),
        cwd: originalFile.cwd,
        path: path.join(path.dirname(originalFile.path), filename)
    });
}

module.exports = function CSSChunker(options={}){

    const RE_CHUNKSTART = /\/\* START OF CHUNK: (\w+) \*\//gi;
    const PLUGIN_NAME = 'css-chunk';

    options.filenameFormatter = (
        options.filenameFormatter || defaultFilenameFormatter);

    function defaultFilenameFormatter(chunkKey, basename, ext, originalFile){
        return `${basename}_${chunkKey}${ext}`;
    }

    function createChunks(css) {

        const chunks = {};

        let found = null;
        while ((found = RE_CHUNKSTART.exec(css)) !== null) {
            const chunkName = found[1];
            const startPosition = found[0].length + found.index;
            const endPosition = css.indexOf(
                `/* END OF CHUNK: ${chunkName} */`);
            const chunkContents = css.substring(startPosition, endPosition);
            chunks[chunkName] = chunkContents;
        }

        return chunks;
    }

    return through2.obj(function(file, encoding, callback){

        if(file.isNull()){
            return callback(null, file);
        }

        if (file.isStream()) {
            this.emit(
                'error',
                new PluginError(PLUGIN_NAME, 'Streams not supported!')
            );
        }

        const ext = path.extname(file.path);
        const base = path.basename(file.path, ext);
        const chunks = createChunks(file.contents.toString('ascii'));

        if(Object.keys(chunks).length == 0){
            this.push(file);
        } else {
            for(const [chunkKey, chunkCss] of Object.entries(chunks)){
                const filename = options.filenameFormatter(
                    chunkKey, base, ext, file);
                const chunkFile = newFile(file, filename, chunkCss);

                // This is to transfer the sourceMap if one has been set
                // on the original file
                if(file.sourceMap){
                    chunkFile.sourceMap = file.sourceMap;
                }

                this.push(chunkFile);
            }
        }

        callback();
    });

}

