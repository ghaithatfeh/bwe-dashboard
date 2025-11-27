-- Disable RLS for categories table
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Disable RLS for products table  
ALTER TABLE products DISABLE ROW LEVEL SECURITY;

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read categories
CREATE POLICY "Allow public read access on categories"
ON categories FOR SELECT
TO public
USING (true);

-- Allow anyone to read products
CREATE POLICY "Allow public read access on products"
ON products FOR SELECT
TO public
USING (true);