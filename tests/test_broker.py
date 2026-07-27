import asyncio

from app.realtime.broker import BrokerEvent, EventBroker, Subscriber


def test_subscriber_bounded_latest_wins():
    sub = Subscriber(maxsize=3)
    for i in range(10):
        sub.offer(BrokerEvent(event="update", data={"v": i}, id=i))
    # Only the last 3 remain (oldest dropped).
    drained = []
    while not sub.queue.empty():
        drained.append(sub.queue.get_nowait().data["v"])
    assert drained == [7, 8, 9]


async def test_publish_fans_out_to_all():
    broker = EventBroker()
    subs = [await broker._register() for _ in range(3)]
    await broker.publish(BrokerEvent(event="update", data={"x": 1}, id=1))
    for s in subs:
        evt = s.queue.get_nowait()
        assert evt.data == {"x": 1}
    assert broker.subscriber_count == 3
    for s in subs:
        await broker._unregister(s)
    assert broker.subscriber_count == 0


async def test_subscribe_unregisters_on_close():
    broker = EventBroker()
    agen = broker.subscribe()
    it = agen.__aiter__()

    async def consume_one():
        return await it.__anext__()

    task = asyncio.create_task(consume_one())
    await asyncio.sleep(0.01)
    assert broker.subscriber_count == 1
    await broker.publish(BrokerEvent(event="snapshot", data={"a": 1}))
    evt = await task
    assert evt.data == {"a": 1}
    await agen.aclose()
    assert broker.subscriber_count == 0
