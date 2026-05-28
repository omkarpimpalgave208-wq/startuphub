import { supabase } from './supabase';
import type { Product, Profile, Comment, Discussion, Notification, Bookmark } from '../types';

const STORAGE_BUCKET = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? 'products';

export const api = {
  // ==========================================
  // 1. PRODUCTS / STARTUPS API
  // ==========================================
  async getProducts(options: { 
    trending?: boolean; 
    category?: string; 
    limit?: number; 
    offset?: number; 
    userId?: string; 
  } = {}): Promise<Product[]> {
    const { trending = false, category, limit = 20, offset = 0, userId } = options;

    let query = supabase
      .from('products')
      .select(`
        *,
        profiles:user_id (*),
        comments:comments (count),
        upvotes:upvotes (count)
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    }
    if (category && category !== 'all') {
      query = query.eq('category', category.toLowerCase());
    }

    if (trending) {
      query = query.order('upvote_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    
    // Typecast to array and return
    return (data || []) as unknown as Product[];
  },

  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        profiles:user_id (*),
        comments:comments (count),
        upvotes:upvotes (count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // No rows returned
      throw error;
    }
    return data as unknown as Product;
  },

  async createProduct(productData: {
    user_id: string;
    name: string;
    tagline: string;
    description: string;
    category: string;
    website_url?: string;
    github_url?: string;
    logo_url?: string;
    screenshots?: string[];
    banner_url?: string;
  }): Promise<Product> {
    if (!productData.user_id) {
      throw new Error('Please login first');
    }

    if (!productData.name?.trim() || !productData.tagline?.trim() || !productData.description?.trim() || !productData.category?.trim()) {
      throw new Error('Please provide name, tagline, description, and category for the product.');
    }

    const payload = {
      user_id: productData.user_id,
      name: productData.name.trim(),
      tagline: productData.tagline.trim(),
      description: productData.description.trim(),
      category: productData.category.trim().toLowerCase(),
      website_url: productData.website_url?.trim() || null,
      github_url: productData.github_url?.trim() || null,
      logo_url: productData.logo_url ? productData.logo_url.trim() : null,
      screenshots: Array.isArray(productData.screenshots) ? productData.screenshots.filter(Boolean) : [],
      banner_url: productData.banner_url ? productData.banner_url.trim() : null,
      upvote_count: 0
    };

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select(`
        *,
        profiles:user_id (*)
      `)
      .single();

    if (error) {
      console.error('[api.createProduct] Supabase error:', error);
      throw error;
    }
    return data as unknown as Product;
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Product;
  },

  async deleteProduct(id: string): Promise<void> {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  async deleteProductSecure(productId: string, userId: string): Promise<void> {
    if (!productId || !userId) {
      throw new Error('Product ID and user ID are required');
    }

    console.log('[api.deleteProductSecure] Attempting to delete product:', { productId, userId });

    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId)
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('[api.deleteProductSecure] Supabase error:', error);
      throw error;
    }

    if (!data || data.length === 0) {
      console.warn('[api.deleteProductSecure] No product deleted - user may not own this product');
      throw new Error('You can only delete your own products');
    }

    console.log('[api.deleteProductSecure] Product deleted successfully');
  },

  // ==========================================
  // 2. DISCUSSIONS API
  // ==========================================
  async getDiscussions(options: { 
    trending?: boolean; 
    category?: string; 
    limit?: number; 
    offset?: number; 
  } = {}): Promise<Discussion[]> {
    const { trending = false, category, limit = 20, offset = 0 } = options;

    let query = supabase
      .from('discussions')
      .select(`
        *,
        profiles:user_id (*),
        comments:comments (count),
        upvotes:discussion_upvotes (count)
      `);

    if (category && category !== 'all') {
      // Capitalize first letter to match discussion categories
      const formattedCategory = category.charAt(0).toUpperCase() + category.slice(1);
      query = query.eq('category', formattedCategory);
    }

    if (trending) {
      query = query.order('upvote_count', { ascending: false });
    } else {
      query = query.order('created_at', { ascending: false });
    }

    query = query.range(offset, offset + limit - 1);

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as Discussion[];
  },

  async getDiscussion(id: string): Promise<Discussion | null> {
    const { data, error } = await supabase
      .from('discussions')
      .select(`
        *,
        profiles:user_id (*),
        comments:comments (count),
        upvotes:discussion_upvotes (count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data as unknown as Discussion;
  },

  async createDiscussion(discussionData: {
    user_id: string;
    title: string;
    content: string;
    category: string;
  }): Promise<Discussion> {
    const { data, error } = await supabase
      .from('discussions')
      .insert({
        user_id: discussionData.user_id,
        title: discussionData.title,
        content: discussionData.content,
        category: discussionData.category,
        upvote_count: 0
      })
      .select(`
        *,
        profiles:user_id (*)
      `)
      .single();

    if (error) throw error;
    return data as unknown as Discussion;
  },

  // ==========================================
  // 3. COMMENTS API
  // ==========================================
  async getComments(options: { 
    productId?: string; 
    discussionId?: string; 
    parentId?: string | null; 
  }): Promise<Comment[]> {
    const { productId, discussionId, parentId } = options;

    let query = supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (*)
      `)
      .order('created_at', { ascending: false });

    if (productId) {
      query = query.eq('product_id', productId);
    }
    if (discussionId) {
      query = query.eq('discussion_id', discussionId);
    }
    if (parentId !== undefined) {
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as Comment[];
  },

  async createComment(commentData: {
    user_id: string;
    product_id?: string;
    discussion_id?: string;
    parent_id?: string;
    content: string;
  }): Promise<Comment> {
    const { data, error } = await supabase
      .from('comments')
      .insert({
        user_id: commentData.user_id,
        product_id: commentData.product_id || null,
        discussion_id: commentData.discussion_id || null,
        parent_id: commentData.parent_id || null,
        content: commentData.content
      })
      .select(`
        *,
        profiles:user_id (*)
      `)
      .single();

    if (error) throw error;

    // Direct, secure notification creation for commenting inside API layer!
    try {
      if (commentData.product_id) {
        const product = await this.getProduct(commentData.product_id);
        if (product && product.user_id !== commentData.user_id) {
          await supabase.from('notifications').insert({
            user_id: product.user_id,
            type: 'comment',
            actor_id: commentData.user_id,
            product_id: commentData.product_id,
            message: `commented on your product "${product.name}"`
          });
        }
      } else if (commentData.discussion_id) {
        const discussion = await this.getDiscussion(commentData.discussion_id);
        if (discussion && discussion.user_id !== commentData.user_id) {
          await supabase.from('notifications').insert({
            user_id: discussion.user_id,
            type: 'comment',
            actor_id: commentData.user_id,
            discussion_id: commentData.discussion_id,
            message: `commented on your discussion "${discussion.title}"`
          });
        }
      }
    } catch (notifErr) {
      console.error('[API] Failed to trigger comment notification:', notifErr);
    }

    return data as unknown as Comment;
  },

  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // ==========================================
  // 4. UPVOTES & FOLLOWS & BOOKMARKS API
  // ==========================================
  async getUpvotes(options: { user_id?: string; product_id?: string }): Promise<any[]> {
    let query = supabase.from('upvotes').select('*');
    if (options.user_id) query = query.eq('user_id', options.user_id);
    if (options.product_id) query = query.eq('product_id', options.product_id);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async addUpvote(userId: string, productId: string): Promise<void> {
    // Perform upvote insertion
    const { error } = await supabase
      .from('upvotes')
      .insert({ user_id: userId, product_id: productId });
    
    if (error && error.code !== '23505') throw error; // Ignore duplicate key errors

    // Execute atomic upvotes increment RPC
    const { error: rpcErr } = await supabase.rpc('increment_upvote_count', { product_id: productId });
    if (rpcErr) console.error('[API] increment RPC failed:', rpcErr);

    // Secure notification insert in background
    try {
      const product = await this.getProduct(productId);
      if (product && product.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: product.user_id,
          type: 'upvote',
          actor_id: userId,
          product_id: productId,
          message: `upvoted your product "${product.name}"`
        });
      }
    } catch (notifErr) {
      console.error('[API] Failed to send upvote notification:', notifErr);
    }
  },

  async removeUpvote(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('upvotes')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;

    // Execute atomic upvotes decrement RPC
    const { error: rpcErr } = await supabase.rpc('decrement_upvote_count', { product_id: productId });
    if (rpcErr) console.error('[API] decrement RPC failed:', rpcErr);
  },

  async getDiscussionUpvotes(options: { user_id?: string; discussion_id?: string }): Promise<any[]> {
    let query = supabase.from('discussion_upvotes').select('*');
    if (options.user_id) query = query.eq('user_id', options.user_id);
    if (options.discussion_id) query = query.eq('discussion_id', options.discussion_id);
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  },

  async addDiscussionUpvote(userId: string, discussionId: string): Promise<void> {
    const { error } = await supabase
      .from('discussion_upvotes')
      .insert({ user_id: userId, discussion_id: discussionId });

    if (error && error.code !== '23505') throw error;

    const { error: rpcErr } = await supabase.rpc('increment_discussion_upvote_count', { discussion_id: discussionId });
    if (rpcErr) console.error('[API] increment RPC failed:', rpcErr);

    try {
      const discussion = await this.getDiscussion(discussionId);
      if (discussion && discussion.user_id !== userId) {
        await supabase.from('notifications').insert({
          user_id: discussion.user_id,
          type: 'upvote',
          actor_id: userId,
          discussion_id: discussionId,
          message: `upvoted your discussion "${discussion.title}"`
        });
      }
    } catch (notifErr) {
      console.error('[API] Failed to send discussion upvote notification:', notifErr);
    }
  },

  async removeDiscussionUpvote(userId: string, discussionId: string): Promise<void> {
    const { error } = await supabase
      .from('discussion_upvotes')
      .delete()
      .eq('user_id', userId)
      .eq('discussion_id', discussionId);

    if (error) throw error;

    const { error: rpcErr } = await supabase.rpc('decrement_discussion_upvote_count', { discussion_id: discussionId });
    if (rpcErr) console.error('[API] decrement RPC failed:', rpcErr);
  },

  async getBookmarks(userId: string): Promise<Bookmark[]> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select(`
        *,
        products:product_id (
          *,
          profiles:user_id (*),
          comments:comments (count),
          upvotes:upvotes (count)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as Bookmark[];
  },

  async checkBookmark(userId: string, productId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookmarks')
      .select('id')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async addBookmark(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('bookmarks')
      .insert({ user_id: userId, product_id: productId });

    if (error && error.code !== '23505') throw error;
  },

  async removeBookmark(userId: string, productId: string): Promise<void> {
    const { error } = await supabase
      .from('bookmarks')
      .delete()
      .eq('user_id', userId)
      .eq('product_id', productId);

    if (error) throw error;
  },

  async checkFollow(followerId: string, followedId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('followed_id', followedId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  },

  async addFollow(followerId: string, followedId: string): Promise<void> {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, followed_id: followedId });

    if (error && error.code !== '23505') throw error;

    // Insert follow notification in background
    try {
      await supabase.from('notifications').insert({
        user_id: followedId,
        type: 'follow',
        actor_id: followerId,
        message: 'started following you'
      });
    } catch (notifErr) {
      console.error('[API] Failed to trigger follow notification:', notifErr);
    }
  },

  async removeFollow(followerId: string, followedId: string): Promise<void> {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('followed_id', followedId);

    if (error) throw error;
  },

  // ==========================================
  // 5. PROFILES & STORAGE API
  // ==========================================
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        products:products (count),
        followers:follows!followed_id (count),
        following:follows!follower_id (count)
      `)
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    // Standardize mapping counters for UI compatibility
    return {
      ...data,
      products: data.products?.[0]?.count || 0,
      followers: data.followers?.[0]?.count || 0,
      following: data.following?.[0]?.count || 0
    } as unknown as Profile;
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        products:products (count),
        followers:follows!followed_id (count),
        following:follows!follower_id (count)
      `)
      .eq('username', username)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    
    return {
      ...data,
      products: data.products?.[0]?.count || 0,
      followers: data.followers?.[0]?.count || 0,
      following: data.following?.[0]?.count || 0
    } as unknown as Profile;
  },

  async updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;
    return data as unknown as Profile;
  },

  async getProfiles(limit = 50): Promise<Profile[]> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        *,
        products:products (count)
      `)
      .limit(limit);

    if (error) throw error;
    return (data || []).map(p => ({
      ...p,
      products: p.products?.[0]?.count || 0
    })) as unknown as Profile[];
  },

  async ensureStorageBucket(): Promise<void> {
    try {
      const response = await fetch('/api/storage-setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bucket: STORAGE_BUCKET })
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Unable to verify storage bucket configuration.');
      }
    } catch (err: any) {
      throw new Error(err?.message || 'Unable to configure storage bucket.');
    }
  },

  async uploadFile(file: File, folder: string): Promise<string> {
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/svg+xml'];
    const maxBytes = folder === 'avatars' ? 2 * 1024 * 1024 : 10 * 1024 * 1024;

    if (!allowedImageTypes.includes(file.type)) {
      throw new Error('Unsupported file type. Upload a PNG, JPG, WebP, GIF, or SVG image.');
    }

    if (file.size > maxBytes) {
      throw new Error(`File is too large. Max allowed size is ${maxBytes / (1024 * 1024)}MB.`);
    }

    const fileExt = file.name.split('.').pop() || 'png';
    const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const attemptUpload = async () => {
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        if (uploadError.status === 404) {
          return uploadError;
        }
        throw new Error(uploadError.message || 'Upload failed. Please try again.');
      }
      return null;
    };

    let uploadError = await attemptUpload();
    if (uploadError) {
      await this.ensureStorageBucket();
      uploadError = await attemptUpload();
    }

    if (uploadError) {
      if (uploadError.status === 404) {
        throw new Error(`Storage bucket "${STORAGE_BUCKET}" was not found and could not be created automatically. Please verify the Supabase bucket or set VITE_SUPABASE_STORAGE_BUCKET.`);
      }
      throw new Error(uploadError.message || 'Upload failed. Please try again.');
    }

    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      throw new Error('Failed to retrieve public URL for uploaded image.');
    }

    return urlData.publicUrl;
  },

  // ==========================================
  // 6. NOTIFICATIONS & SEARCH API
  // ==========================================
  async getNotifications(userId: string, unreadOnly = false): Promise<Notification[]> {
    let query = supabase
      .from('notifications')
      .select(`
        *,
        actor:actor_id (*),
        product:product_id (id, name, logo_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as unknown as Notification[];
  },

  async markNotificationRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);

    if (error) throw error;
  },

  async markAllNotificationsRead(userId: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId);

    if (error) throw error;
  },

  async searchAll(queryStr: string): Promise<{ products: Product[]; profiles: Profile[]; discussions: Discussion[] }> {
    if (!queryStr.trim()) return { products: [], profiles: [], discussions: [] };

    const searchPattern = `%${queryStr}%`;

    const [productsRes, profilesRes, discussionsRes] = await Promise.all([
      supabase
        .from('products')
        .select(`
          *,
          profiles:user_id (*),
          comments:comments (count),
          upvotes:upvotes (count)
        `)
        .ilike('name', searchPattern)
        .limit(10),
      supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.${searchPattern},full_name.ilike.${searchPattern}`)
        .limit(10),
      supabase
        .from('discussions')
        .select(`
          *,
          profiles:user_id (*),
          comments:comments (count),
          upvotes:discussion_upvotes (count)
        `)
        .ilike('title', searchPattern)
        .limit(10)
    ]);

    return {
      products: (productsRes.data || []) as unknown as Product[],
      profiles: (profilesRes.data || []) as unknown as Profile[],
      discussions: (discussionsRes.data || []) as unknown as Discussion[]
    };
  },

  // ==========================================
  // 7. MEMORY-SAFE REALTIME SUBSCRIPTIONS HELPER
  // ==========================================
  subscribeToChanges(
    channelName: string,
    tableName: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: (payload: any) => void
  ): () => void {
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event,
          schema: 'public',
          table: tableName
        },
        (payload) => {
          callback(payload);
        }
      )
      .subscribe();

    // Return the clean unsubscription cleanup handler to avoid memory leakage!
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
