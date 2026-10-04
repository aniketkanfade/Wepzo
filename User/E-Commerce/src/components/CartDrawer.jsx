import { imageOf, money } from '../lib/storefront'

export default function CartDrawer({ open, onClose, cart, count, subtotal, business, changeQty, checkout, setCheckout, address, setAddress, phone, setPhone, location, setLocationOpen, busy, placeOrder, calculateQuote }) {
  if (!open) return null

  return <div className="overlay fixed inset-0 z-20 flex justify-end bg-slate-900/70" onMouseDown={event => event.target === event.currentTarget && onClose()}>
    <aside className="drawer flex h-full flex-col bg-white p-6 shadow-2xl">
      <div className="drawer-head">
        <div><span className="eyebrow">THE GOOD STUFF</span><h2>Your bag <em>({count})</em></h2></div>
        <button className="close" onClick={onClose}>Ã—</button>
      </div>
      {cart.length ? <>
        <div className="cart-lines">{cart.map(item => <div className="cart-line" key={item.id}>
          <div className="cart-thumb">{item.image ? <img src={item.image} alt="" /> : '?'}</div>
          <div className="line-info">
            <b>{item.name}</b><span>{money(item.price, business)}</span>
            <div className="quantity"><button onClick={() => changeQty(item, -1)}>-</button><span>{item.qty}</span><button onClick={() => changeQty(item, 1)}>+</button></div>
          </div>
          <b>{money(item.price * item.qty, business)}</b>
        </div>)}</div>
        <div className="cart-bottom">
          <div className="subtotal"><span>Subtotal</span><b>{money(subtotal, business)}</b></div>
          <small>Shipping and taxes calculated at checkout.</small>
          {checkout && <>
            <label className="field">Delivery address<textarea value={address} onChange={event => setAddress(event.target.value)} placeholder="House, street, area and city" /></label>
            <label className="field">Phone number<input value={phone} onChange={event => setPhone(event.target.value)} placeholder="10-digit mobile number" /></label>
            <div className="checkout-location">Delivering to {location.pincode || 'your selected location'} <button onClick={() => setLocationOpen(true)}>Change</button></div>
            <button className="button button-dark wide" disabled={busy} onClick={placeOrder}>{busy ? 'Placing orderâ€¦' : 'Place order Â· Cash on delivery'}</button>
          </>}
          {!checkout && <button className="button button-dark wide" onClick={() => {
            setCheckout(true)
            calculateQuote()
          }}>Continue to checkout <span>&rarr;</span></button>}
        </div>
      </> : <div className="empty-cart"><span>*</span><h3>A little space for something lovely.</h3><p>Your bag is waiting for its first good thing.</p>
        <button className="button button-dark" onClick={onClose}>Keep exploring</button>
      </div>}
    </aside>
  </div>
}
