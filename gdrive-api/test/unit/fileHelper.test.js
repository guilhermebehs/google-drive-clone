import {
    describe,
    test,
    expect,
    jest
} from '@jest/globals'
import fs from 'fs'
import FileHelper from '../../src/fileHelper'

describe('FileHelper', ()=>{
    describe('getFileStatus',()=>{
        test('it should return files statuses in correct format',async()=>{
            const statMock = 
                {
                    dev: 2051,
                    mode: 33204,
                    nlink: 1,
                    uid: 1000,
                    gid: 1000,
                    rdev: 0,
                    blksize: 4096,
                    ino: 77742454,
                    size: 5497,
                    blocks: 16,
                    atimeMs: 1630949460053.8335,
                    mtimeMs: 1630949459973,
                    ctimeMs: 1630949459969.8337,
                    birthtimeMs: 1630949441125.8977,
                    atime: '2021-09-06T17:31:00.054Z',
                    mtime: '2021-09-06T17:30:59.973Z',
                    ctime: '2021-09-06T17:30:59.970Z',
                    birthtime: '2021-09-06T17:30:41.126Z'
            }
            const mockUser = 'guilhermebehs'
            process.env.USER = mockUser
            const filename = 'file.png'
            jest.spyOn(fs.promises,fs.promises.readdir.name)
                 .mockResolvedValue([filename])
            jest.spyOn(fs.promises,fs.promises.stat.name)
                 .mockResolvedValue(statMock)
            const result =  await FileHelper.getFileStatus('/tmp')
            const expectedResult = [
                {
                  size: "5.5 kB",
                  lastModified: statMock.birthtime,
                  owner: mockUser,
                  file: filename
                }
            ]
            expect(fs.promises.stat).toHaveBeenCalledWith(`/tmp/${filename}`)
            expect(result).toEqual(expectedResult)
        })
    })
})