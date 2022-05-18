import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import { api } from "../services/api";
import { Product, Stock } from "../types";

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storedCart = localStorage.getItem("@RocketShoes:cart");

    if (storedCart) {
      return JSON.parse(storedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  });

  const addProduct = async (productId: number) => {
    try {
      const [targetProduct] = cart.filter(
        (product) => product.id === productId
      );

      if (targetProduct) {
        const stock = await api.get(`stock/${productId}`);
        const data = stock.data as Stock;

        if (
          targetProduct.amount + 1 > data.amount ||
          targetProduct.amount <= 0
        ) {
          toast.error("Quantidade solicitada fora de estoque");
          return;
        }

        const cartUpdated = cart.map((product) => {
          if (product.id === productId) {
            product.amount++;
          }

          return product;
        });

        setCart(cartUpdated);
      } else {
        const { data } = await api.get(`/products/${productId}`);

        data.amount = 1;

        const cartUpdated = [...cart, data];

        setCart(cartUpdated);
      }
    } catch {
      toast.error("Erro na adição do produto");
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const cartUpdated = cart.filter((product) => product.id !== productId);

      if (cartUpdated.length === cart.length) {
        throw toast.error("Erro na remoção do produto");
      }

      setCart(cartUpdated);
    } catch {
      toast.error("Erro na remoção do produto");
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) return;

      const stock = await api.get(`stock/${productId}`);
      const data = stock.data as Stock;

      if (amount > data.amount) {
        toast.error("Quantidade solicitada fora de estoque");
        return;
      }

      const cartUpdated = cart.map((product) => {
        if (product.id === productId) {
          product.amount = amount;
        }

        return product;
      });

      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
      setCart(cartUpdated);
    } catch {
      toast.error("Erro na alteração de quantidade do produto");
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
