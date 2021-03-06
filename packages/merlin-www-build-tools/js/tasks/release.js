'use strict';
/* globals process, setImmediate, Buffer */
/* eslint-disable no-console */

monkeypatchGitRawCommits();

const {utimes} = require('fs');
const gulp = require('gulp');
const conventionalChangelog = require('gulp-conventional-changelog');
const bump = require('gulp-bump');
const flog = require('fancy-log');
const git = require('gulp-git');
const minimist = require('minimist');
const through2 = require('through2');

const utils = require('../utils');

/* eslint-disable no-unused-vars */
module.exports = function taskReleaseExports(taskConfig, browserSync) {
/* eslint-enable no-unused-vars */

    const args = minimist(process.argv.slice(2));

    /**
     * This fixes an issue where vinyl-fs doesnt update the modified time
     * so git wont detect a change.
     * https://github.com/gulpjs/gulp/issues/1461#issuecomment-167550941
     */
    const touch = through2.obj(function(file, enc, done) {
        var now = new Date;
        utimes(file.path, now, now, done);
    });

    function validateArgs(done){
        if (!args.patch && !args.minor && !args.major) {
            throw new Error('No version bump specified! Quitting release.');
        }
        done();
    }

    gulp.task('create-changelog', function(done){
        utils.createFileNotExist(taskConfig.release.changelog, done);
    });

    gulp.task('changelog', function() {
        return gulp.src(taskConfig.release.changelog, {
            buffer: false
        })
            .pipe(conventionalChangelog({
                preset: 'angular',
                releaseCount: 0
            }))
            .pipe(gulp.dest('./'));
    });

    gulp.task('bump-version', function() {
        let bumpType = null;
        if (args.patch) {
            bumpType = 'patch';
        } else if (args.minor) {
            bumpType = 'minor';
        } else if (args.major) {
            bumpType = 'major';
        }

        return gulp.src([
            taskConfig.release.package
        ])
            .pipe(bump({
                type: bumpType
            }).on('error', flog))
            .pipe(gulp.dest('./'))
            .pipe(touch);
    });

    gulp.task('commit-changes', function() {
        const msg = `chore(Release): v${utils.getPackageJsonVersion(taskConfig.release.package)}`;
        return gulp.src([
            taskConfig.release.package,
            taskConfig.release.changelog
        ])
            .pipe(git.add())
            .pipe(git.commit(msg));
    });

    gulp.task('push-changes', function (cb) {
        git.push('origin', 'master', cb);
    });

    gulp.task('create-new-tag', function(cb) {
        const version = utils.getPackageJsonVersion(taskConfig.release.package);
        git.tag(`v${version}`, `Created Tag for version: ${version}`, function(error) {
            if (error) {
                return cb(error);
            }
            git.push('origin', `v${version}`, cb);
        });
    });

    return gulp.series(
        validateArgs,
        'create-changelog',
        'bump-version',
        'changelog',
        'commit-changes',
        'push-changes',
        'create-new-tag'
    );

};



/**
 * Currently in GQ we have a commit message that is 17000+ characters long.
 * This currently breaks conventional-changelog as a regex stops on it. We
 * looked at multiple solutions:
 * - Correcting the regex in conventional changelog. This should be the
 * solution but would mean rewriting some of the parser logic which at the
 * moment I don't have time for.
 * - Rebasing the branch and truncating the message ourself.
 * - Or monkey patch. This seemed suitable for the moment.
 *
 * Once I get some time, I'll submit a PR to conventional changelog with the
 * tests.
 *
 */
function monkeypatchGitRawCommits(){
    const charLimit = 1000;

    const stream = require('stream');

    /* eslint-disable no-unused-vars */
    // Require this in case its not already been loaded into require.cache
    const gitRawCommits = require('git-raw-commits');
    /* eslint-enable no-unused-vars */

    // Find git raw commit module key in cache
    let gitRawCommitKey = null;
    for(const key in require.cache){
        if(key.indexOf('/git-raw-commits/') !== -1){
            gitRawCommitKey = key;
            break;
        }
    }

    // Cant find the key? Erm...
    if(gitRawCommitKey === null){
        throw new Error('Cannot find git-raw-commits require cache key!');
    }

    // Grab the module.exports function
    const GRCModule = require.cache[gitRawCommitKey];
    const originalFn = GRCModule.exports;

    /**
     * So the idea is that we:
     * - take the readable stream
     * - pipe the readable stream into a transform
     * - truncate any commits
     * - pipe to another readable stream
     * - return that
     */
    GRCModule.exports = function(){
        const sourceReadableStream = originalFn(...arguments);
        const outputReadableStream = new stream.Readable();
        outputReadableStream._read = function() {};

        const transformStream = new stream.Transform();

        transformStream._transform = transformCommit;

        sourceReadableStream.pipe(transformStream);
        let isError = false;
        transformStream.pipe(through2(function(chunk, enc, cb) {
            outputReadableStream.push(chunk);
            isError = false;

            cb();
        }, function(cb) {
            setImmediate(function() {
                if (!isError) {
                    outputReadableStream.push(null);
                    outputReadableStream.emit('close');
                }

                cb();
            });
        }));

        return outputReadableStream;
    };

    function transformCommit(chunk, enc, cb){
        let realChunk = null;

        // Get the commit body. This is up to -hash-
        const chunkString = chunk.toString('utf8');
        const hashIndex = chunkString.indexOf('\n-hash-');
        let commitMessage = chunkString.substr(0, hashIndex);

        // Check the length
        if(commitMessage.length > charLimit){
            commitMessage = commitMessage.substr(0, charLimit);
            // Rebuild the commit with the truncated message
            const commit = `${commitMessage}\n${chunkString.substr(hashIndex)}`;
            realChunk = Buffer.from(commit, 'utf8');
            console.warn('Commit message has been truncated!\n', commit);
        } else {
            realChunk = chunk;
        }

        cb(null, realChunk);
    }

}