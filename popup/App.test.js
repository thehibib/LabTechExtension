import { describe, it, expect, vi, beforeEach } from "vitest"
import { getQuartzyOrders, sendQuartzyOrders } from "./App"

// naming the set of sets
describe("Quartzy API logic", () => {
  // runs before each "it"
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Mock alert so it doesn't actually popup
    global.alert = vi.fn()

    // Mock Chrome object (the service worker environment)
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
      },
    }
  })
// 1st test
  it("getQuartzyOrders() should resolve returned orderData", async () => {
    // sample data to simulate quartzy return
    const fakeOrders = [{ id: 1, name: "Test Order" }]

    // When getQuartzyOrders calls chrome.runtime.sendMessage, simulate a response
    // tells the call how to behave
    // _req means we don't care about it (normally msg, callback,but in this case we KNOW what the message should be)
    chrome.runtime.sendMessage.mockImplementation((_req, callback) => {
      callback({ orderData: fakeOrders })
    })
    // now that we've mocked the stuff the function will call, we can call the function!
    const result = await getQuartzyOrders()

    expect(result).toEqual(fakeOrders)
  })
// 2nd test
  it("sendQuartzyOrders() should fetch and then upload orders", async () => {
    const fakeOrders = [{ id: 1, name: "Test Order" }]

    // First call: FETCH_QUARTZY
    // Second call: SEND_QUARTZY
    // bcz we use 2 calls in send, both one that fetches like in getquartzyorders, and now a send to sheets
    // so instead of _req, we use req which can change
    chrome.runtime.sendMessage.mockImplementation((req, callback) => {
      if (req.type === "FETCH_QUARTZY") {
        callback({ orderData: fakeOrders })
      }
      if (req.type === "SEND_QUARTZY") {
        callback({ message: "Uploaded!" })
      }
    })

    const result = await sendQuartzyOrders()

    expect(result).toBe("Uploaded!")
    expect(chrome.runtime.sendMessage).toHaveBeenCalledTimes(3)
  })
})

// want to test 3 situations where errors occurs
// getorders fails to get data from quartzy (doesn't exist in the code, wrapped in send orders, but we still want to have it throw an error)
// send orders cannot fetch the orders
// send orders cannot send the orders to sheets
describe("Data pipeline errors", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()

    // Mock alert so it doesn't actually popup
    global.alert = vi.fn()

    // Mock Chrome object (the service worker environment)
    global.chrome = {
      runtime: {
        sendMessage: vi.fn(),
      },
    }
  })
  // realistically it alerts either way
  it("getQuartzyOrders alerts when sendmessage throws", async () => {
    const fakeError = new Error('quartzy error')

    chrome.runtime.sendMessage.mockImplementation(() => {
      throw fakeError
    })

    await expect(getQuartzyOrders()).rejects.toThrow("quartzy error")
  })
// THE PLACE WE'RE TESTING
  // try {
  //       orders = await getQuartzyOrders();
  //       console.log("got orders:",orders);        
  //   } catch (e){
  //       alert("error fetching orders",e);
  //       console.error("error fetching orders",e);
  it("sendQuartzyOrders alerts and throws when getQuartzyOrders errors", async () => {
    const fakeError = new Error("fetch fail")

    chrome.runtime.sendMessage.mockImplementation(() => {
      throw fakeError
    })

    await expect(sendQuartzyOrders()).rejects.toThrow("fetch fail")

    expect(alert).toHaveBeenCalledWith("error fetching orders", fakeError)
  })
  // now the fetch should succeed but the send should fail. TESTING THIS
// }catch (e){
//   alert("error sending orders",e);
//   console.error("error sending orders",e);
// }
  it("sendQuartzyOrders alerts when sending to Sheets", async () => {
    const fakeError = new Error("send fail")
    const fakeOrders = [{ id: 1}]

    chrome.runtime.sendMessage.mockImplementation((req,callback) => {
      if (req.type === "FETCH_QUARTZY"){
        callback({orderData: fakeOrders})
      }
      if (req.type === "SEND_QUARTZY"){
        throw fakeError
      }
    })

    await expect(sendQuartzyOrders()).rejects.toThrow("send fail")
    expect(alert).toHaveBeenCalledWith("error sending orders",fakeError)

  })
})
