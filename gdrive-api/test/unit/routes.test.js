import {
    describe,
    test,
    expect,
    jest
} from '@jest/globals'
import Routes from '../../src/routes.js'
import { logger } from '../../src/logger'
import { UploadHandler } from '../../src/uploadHandler.js'
import { TestUtil } from '../utils/testUtil.js'

describe('Routes', ()=>{
    const request = TestUtil.generateReadableStream(['Some file bytes'])
    const response = TestUtil.generateWritableStream(()=>{})
    const defaultParams = {
        request: Object.assign(request,{
            headers:{
                'Content-Type': 'multipart/form-data'
            },
            method:'',
            body: '',
        }),
        response: Object.assign(response,{
            writeHead: jest.fn(),
            setHeader: jest.fn(),
            end: jest.fn()
        }),
        values: ()=> Object.values(defaultParams)
    }
    beforeEach(()=>{
        jest.spyOn(logger, 'info')
           .mockImplementation()
    })
    describe('setSocketInstance',()=>{
        test('setSocket should store io instance',()=>{
            const routes = new Routes()
            const ioObj = {
                to: (id)=> ioObj,
                emit: (event, message)=> {}
            }
          routes.setSocketInstance(ioObj)
          expect(routes.io).toEqual(ioObj)
        })
    })
    describe('handle',()=>{
        
        test('given an inexistent route it should choose default route', async()=>{
            const routes = new Routes()
            const params = {
                ...defaultParams
            }
            params.request.method = 'inexistent'
            await routes.handler(...params.values())
           
          expect(params.response.end).toHaveBeenCalledWith('Hello World')
        })
        test('it should set any request with CORS enabled', async()=>{
            const routes = new Routes()
            const params = {
                ...defaultParams
            }
            params.request.method = 'inexistent'
            await routes.handler(...params.values())
           
          expect(params.response.setHeader).toHaveBeenCalledWith('Access-Control-Allow-Origin', '*')
        })
        test('given method OPTIONS it should choose options route',async()=>{
            const routes = new Routes()
            const params = {
                ...defaultParams
            }
            params.request.method = 'OPTIONS'
            await routes.handler(...params.values())
           
          expect(params.response.writeHead).toHaveBeenCalledWith(204)
          expect(params.response.end).toHaveBeenCalled()
        })
        test('given method POST it should choose post route',async()=>{
            const routes = new Routes()
            const params = {
                ...defaultParams
            }
            params.request.method = 'POST'
            jest.spyOn(routes,routes.post.name).mockResolvedValue()
            await routes.handler(...params.values())
           
          expect(routes.post).toHaveBeenCalled()
        })
        test('given method GET it should choose get route',async()=>{
            const routes = new Routes()
            const params = {
                ...defaultParams
            }
            params.request.method = 'GET'
            jest.spyOn(routes,routes.get.name).mockResolvedValue()
            await routes.handler(...params.values())
           
            expect(routes.get).toHaveBeenCalled()
        })
    })
    describe('get', ()=>{
          test('given method GET it should list all files downloaded',async()=>{
            const routes = new Routes()
            const params = {
                ...defaultParams
            }
            const filesStatusesMock = [
                {
                  size: "5.5 kB",
                  lastModified: '2021-09-06T17:30:41.126Z',
                  owner: 'guilhermebehs',
                  file: 'file.txt'
                }
            ]

            jest.spyOn(routes.fileHelper, routes.fileHelper.getFileStatus.name)
              .mockResolvedValue(filesStatusesMock)

              params.request.method = 'GET'
              await routes.handler(...params.values())
              expect(params.response.writeHead).toHaveBeenLastCalledWith(200)
              expect(params.response.end).toHaveBeenCalledWith(JSON.stringify(filesStatusesMock))
          })
          describe('#post',()=>{
              test('it should validate post route workflow',async()=>{
                  const routes = new Routes('/tmp')
                  const options ={
                      ...defaultParams
                  }
                  options.request.method = 'POST'
                  options.request.url = '?socketId=10'
                  jest.spyOn(UploadHandler.prototype,
                      UploadHandler.prototype.registerEvents.name)
                      .mockImplementation((headers,onFinish)=>{
                          const writable = TestUtil.generateWritableStream(()=>{})
                          writable.on('finish', onFinish)
                          return writable
                      })
                  await routes.handler(...options.values())
                  expect(UploadHandler.prototype.registerEvents).toHaveBeenCalled()
                  expect(options.response.writeHead).toHaveBeenCalledWith(200)
                  const expectedResult = JSON.stringify({result: 'Files uploaded with success!'})
                  expect(defaultParams.response.end).toHaveBeenCalledWith(expectedResult)

              })
          })

    })
})