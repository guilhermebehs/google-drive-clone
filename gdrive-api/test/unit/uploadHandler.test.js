import {
    describe,
    test,
    expect,
    jest,
    beforeEach
} from '@jest/globals'
import { UploadHandler } from '../../src/uploadHandler'
import { TestUtil } from '../utils/testUtil'
import fs from 'fs'
import { pipeline } from 'stream/promises'
import { logger } from '../../src/logger'

describe('#UploadHandler test suite',()=>{
    const ioObj ={
        to: (id)=>ioObj,
        emit:(event,message) => {}
    }
    beforeEach(()=>{
        jest.spyOn(logger, 'info')
           .mockImplementation()
    })
    describe('#registerEvents',()=>{
        
        test('should call onFile and onFinish functions on Busboy instance',()=>{
            const uploadHandler = new UploadHandler({
                io:ioObj,
                socketId:'01'
            })
            jest.spyOn(uploadHandler,'onFile')
               .mockResolvedValue()
            
            const headers = {
                'content-type': 'multipart/form-data; boundary='
            }
            const onFinish = jest.fn()
            const busboyInstance = uploadHandler.registerEvents(headers, onFinish)
            const fileStream = TestUtil.generateReadableStream(['chunk', 'of', 'data'])
            busboyInstance.emit('file','fieldname',fileStream,'filename.txt') 
            busboyInstance.listeners("finish")[0].call()
            expect(uploadHandler.onFile).toHaveBeenCalled()
            expect(onFinish).toHaveBeenCalled()
        })
    })
    describe('#onFile',()=>{
        test("given a stream file it should save it on disk", async()=>{
           const chunks = ['hey', 'dude']
           const downloadsFolder = './tmp'
           const handler = new UploadHandler({
               io: ioObj,
               socketId: '01',
               downloadsFolder
           })
           const onData = jest.fn()
           jest.spyOn(fs, 'createWriteStream')
               .mockImplementation(()=> TestUtil.generateWritableStream(onData))
           
           const onTransform = jest.fn()
           jest.spyOn(handler, 'handleFileBytes')
               .mockImplementation(()=> TestUtil.generateTransformStream(onTransform))

           const params = {
               fieldname: 'video',
               file: TestUtil.generateReadableStream(chunks),
               filename: 'any_name.mkv'
           } 
           
           await handler.onFile(...Object.values(params))
           expect(onData.mock.calls.join()).toEqual(chunks.join())
           expect(onTransform.mock.calls.join()).toEqual(chunks.join()) 
           const expectedFilename = handler.downloadsFolder +'/' + params.filename
           expect(fs.createWriteStream).toHaveBeenCalledWith(expectedFilename)

        })
    })
    describe('#handleFileBytes',()=>{
        test('should call emit function and it is a tranform stream', async()=>{
            jest.spyOn(ioObj, ioObj.to.name)
            jest.spyOn(ioObj, ioObj.emit.name)

            const handler = new UploadHandler({
                io: ioObj,
                socketId: '01'
            })
            jest.spyOn(handler, 'canExecute')
              .mockReturnValueOnce(true)
            const messages = ['hello']
            const source = TestUtil.generateReadableStream(messages)
            const onWrite = jest.fn()
            const target = TestUtil.generateWritableStream(onWrite)
            await pipeline(
                source,
                handler.handleFileBytes("filename.txt"),
                target
            )
            expect(ioObj.to).toHaveBeenCalledTimes(messages.length)
            expect(ioObj.emit).toHaveBeenCalledTimes(messages.length)
            expect(onWrite).toHaveBeenCalledTimes(messages.length)
            expect(onWrite.mock.calls.join()).toEqual(messages.join())
        })
        test('given message timerDelay as 2secs it should emit only two message during 2 seconds period', async()=>{
            jest.spyOn(ioObj, 'emit')
            const messageTimeDelay = 2000
            const handler = new UploadHandler({
                messageTimeDelay,
                io: ioObj,
                socketId: '01'
            })
            const day = '2021-07-01 00:01'
            const onFirstLastMessageSent = TestUtil.getTimeFromDate(`${day}:00`)
            const onFirstCanExecute = TestUtil.getTimeFromDate(`${day}:02`)
            const onSecondUpdateLastMessageSent = onFirstCanExecute
            const onSecondCanExecute = TestUtil.getTimeFromDate(`${day}:03`)
            const onThirdCanExecute = TestUtil.getTimeFromDate(`${day}:05`)

            TestUtil.mockDateNow([
                onFirstLastMessageSent,
                onFirstCanExecute,
                onSecondUpdateLastMessageSent,
                onSecondCanExecute,
                onThirdCanExecute 
            ])

            const messages = ['hey','hello', 'world']
            const filename = "filename.avi"
            const expectedMessageSent = 2
            const source = TestUtil.generateReadableStream(messages)
            await pipeline(
                source,
                handler.handleFileBytes(filename)
            )
            expect(ioObj.emit).toHaveBeenCalledTimes(expectedMessageSent)
            const [firstCallResult, secondCallResult] = ioObj.emit.mock.calls
            expect(firstCallResult).toEqual([handler.ON_UPLOAD_EVENT,{processedAlready: "hey".length, filename}])
            expect(secondCallResult).toEqual([handler.ON_UPLOAD_EVENT,{processedAlready: messages.join('').length, filename}])
        })
    })
    describe('#canExecute',()=>{
        test('should return true when time is later than specified delay',()=>{
            const timeDelay = 1000
        
            const uploadHandler = new UploadHandler({
                io: {},
                socketId: '',
                messageTimeDelay: timeDelay
            })
            const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:03')
            TestUtil.mockDateNow([tickNow])
            const tickThreeSecondsBefore = TestUtil.getTimeFromDate('2021-07-01 00:00:00')
            const lastExecution = tickThreeSecondsBefore
            const result = uploadHandler.canExecute(lastExecution)
            expect(result).toBe(true)

        })
        test('should return false when time is not later than specified delay',()=>{
            const timeDelay = 2000
        
            const uploadHandler = new UploadHandler({
                io: {},
                socketId: '',
                messageTimeDelay: timeDelay
            })
            const tickNow = TestUtil.getTimeFromDate('2021-07-01 00:00:01')
            TestUtil.mockDateNow([tickNow])
            const tickOneSecondsBefore = TestUtil.getTimeFromDate('2021-07-01 00:00:00')
            const lastExecution = tickOneSecondsBefore
            const result = uploadHandler.canExecute(lastExecution)
            expect(result).toBe(false)

        })
    })
    
})