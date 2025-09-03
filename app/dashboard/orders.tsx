            <div className="mb-2">Total: ₵{order.total}</div>
                <li key={item.id}>{item.product.title} x {item.quantity} (₵{item.price})</li>
                  <div>Total: ₵{order.total}</div>
                      <li key={item.id}>{item.product.title} x {item.quantity} (₵{item.price})</li>
                      <div className="text-xs text-gray-500">₵{item.price}</div>
                <div className="font-bold">Total: ₵{order.total.toFixed(2)}</div>