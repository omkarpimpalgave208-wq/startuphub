import { supabase } from './supabase';
import type { Product, Profile, Comment, Discussion, Notification, Bookmark, Message, Conversation } from '../types';

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
    banner_image_url?: string;
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
      banner_image_url: productData.banner_image_url ? productData.banner_image_url.trim() : null,
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
    userId?: string;
  } = {}): Promise<Discussion[]> {
    const { trending = false, category, limit = 20, offset = 0, userId } = options;

    let query = supabase
      .from('discussions')
      .select(`
        *,
        profiles:user_id (*),
        comments:comments (count),
        upvotes:discussion_upvotes (count)
      `);

    if (userId) {
      query = query.eq('user_id', userId);
    }

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
      const isReply = Boolean(commentData.parent_id);
      let repliedToUserId: string | null = null;

      if (isReply) {
        const { data: parentComment, error: parentCommentError } = await supabase
          .from('comments')
          .select('id, user_id, product_id, discussion_id')
          .eq('id', commentData.parent_id)
          .single();

        if (parentCommentError) throw parentCommentError;
        repliedToUserId = parentComment?.user_id || null;
      }

      if (!isReply) {
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
            console.info('[API] Created product comment notification', {
              recipient: product.user_id,
              actor: commentData.user_id,
              productId: commentData.product_id
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
            console.info('[API] Created discussion comment notification', {
              recipient: discussion.user_id,
              actor: commentData.user_id,
              discussionId: commentData.discussion_id
            });
          }
        }
      }

      if (isReply && repliedToUserId && repliedToUserId !== commentData.user_id) {
        const replyTarget = commentData.product_id
          ? `product "${(await this.getProduct(commentData.product_id))?.name || 'your product'}"`
          : commentData.discussion_id
          ? `discussion "${(await this.getDiscussion(commentData.discussion_id))?.title || 'your discussion'}"`
          : 'your comment';

        await supabase.from('notifications').insert({
          user_id: repliedToUserId,
          type: 'reply',
          actor_id: commentData.user_id,
          product_id: commentData.product_id || null,
          discussion_id: commentData.discussion_id || null,
          message: `replied to your comment in ${replyTarget}`
        });
        console.info('[API] Created reply notification', {
          recipient: repliedToUserId,
          actor: commentData.user_id,
          parentCommentId: commentData.parent_id
        });
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

    if (error) {
      if (error.code === '23505') {
        console.info('[API] Duplicate discussion upvote ignored, no notification sent', { userId, discussionId });
        return;
      }
      throw error;
    }

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
    try {
      const { data, error } = await supabase
        .from('follows')
        .select('id')
        .eq('follower_id', followerId)
        .eq('followed_id', followedId)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
          console.warn('[api.checkFollow] Table follows missing in database');
          return false;
        }
        throw error;
      }
      return !!data;
    } catch (err) {
      console.warn('[api.checkFollow] Exception checking follow status:', err);
      return false;
    }
  },

  async addFollow(followerId: string, followedId: string): Promise<void> {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: followerId, followed_id: followedId });

    if (error && error.code !== '23505') throw error;

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

  async getConnectionCount(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('connections')
        .select('id')
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);

      if (error) {
        console.warn('[api.getConnectionCount] Table connections error (might not exist yet):', error.message);
        return 0;
      }
      return (data || []).length;
    } catch (err) {
      console.warn('[api.getConnectionCount] Exception fetching connection count:', err);
      return 0;
    }
  },

  async getConnectionStatus(userId: string, profileId: string): Promise<{ state: 'none' | 'request_sent' | 'request_received' | 'connected'; requestId?: string }> {
    try {
      const { data: connection, error: connectionError } = await supabase
        .from('connections')
        .select('id')
        .or(
          `and(user_one_id.eq.${userId},user_two_id.eq.${profileId}),and(user_one_id.eq.${profileId},user_two_id.eq.${userId})`
        )
        .limit(1)
        .single();

      if (connectionError && connectionError.code !== 'PGRST116') {
        if (connectionError.code === 'PGRST205' || connectionError.message.includes('Could not find')) {
          console.warn('[api.getConnectionStatus] Table connections missing in database');
          return { state: 'none' };
        }
        throw connectionError;
      }
      if (connection) {
        return { state: 'connected' };
      }

      const { data, error } = await supabase
        .from('connection_requests')
        .select('*')
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${profileId}),and(sender_id.eq.${profileId},receiver_id.eq.${userId})`
        )
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        if (error.code === 'PGRST205' || error.message.includes('Could not find')) {
          console.warn('[api.getConnectionStatus] Table connection_requests missing in database');
          return { state: 'none' };
        }
        throw error;
      }
      if (!data) return { state: 'none' };

      if (data.status === 'accepted') {
        return { state: 'connected', requestId: data.id };
      }

      if (data.status === 'pending') {
        if (data.sender_id === userId) {
          return { state: 'request_sent', requestId: data.id };
        }
        return { state: 'request_received', requestId: data.id };
      }

      return { state: 'none' };
    } catch (err) {
      console.warn('[api.getConnectionStatus] Exception checking connection status:', err);
      return { state: 'none' };
    }
  },

  async getIncomingConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('id, sender_id, receiver_id, status, created_at, sender:sender_id (id, username, full_name, avatar_url)')
        .eq('receiver_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[api.getIncomingConnectionRequests] Table connection_requests error (might not exist yet):', error.message);
        return [];
      }
      return (data || []) as unknown as ConnectionRequest[];
    } catch (err) {
      console.warn('[api.getIncomingConnectionRequests] Exception fetching connection requests:', err);
      return [];
    }
  },

  async getSentConnectionRequests(userId: string): Promise<ConnectionRequest[]> {
    try {
      const { data, error } = await supabase
        .from('connection_requests')
        .select('id, sender_id, receiver_id, status, created_at, receiver:receiver_id (id, username, full_name, avatar_url)')
        .eq('sender_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('[api.getSentConnectionRequests] Table connection_requests error (might not exist yet):', error.message);
        return [];
      }
      return (data || []) as unknown as ConnectionRequest[];
    } catch (err) {
      console.warn('[api.getSentConnectionRequests] Exception fetching sent connection requests:', err);
      return [];
    }
  },

  async sendConnectionRequest(senderId: string, receiverId: string): Promise<void> {
    if (senderId === receiverId) {
      throw new Error('You cannot send a connection request to yourself.');
    }

    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('id')
      .or(
        `and(user_one_id.eq.${senderId},user_two_id.eq.${receiverId}),and(user_one_id.eq.${receiverId},user_two_id.eq.${senderId})`
      )
      .limit(1)
      .single();

    if (connectionError && connectionError.code !== 'PGRST116') throw connectionError;
    if (connection) {
      throw new Error('You are already connected with this user.');
    }

    const { data: existing, error: existingError } = await supabase
      .from('connection_requests')
      .select('id,status,sender_id,receiver_id')
      .or(
        `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
      )
      .order('created_at', { ascending: false })
      .limit(1);

    if (existingError) throw existingError;
    if (existing && existing.length > 0) {
      const request = existing[0] as ConnectionRequest;
      if (request.status === 'pending') {
        throw new Error('A connection request already exists between these users.');
      }
      if (request.status === 'accepted') {
        throw new Error('You are already connected with this user.');
      }
    }

    const { error } = await supabase
      .from('connection_requests')
      .insert({ sender_id: senderId, receiver_id: receiverId, status: 'pending' });

    if (error) throw error;

    try {
      await supabase.from('notifications').insert({
        user_id: receiverId,
        actor_id: senderId,
        type: 'connect_request',
        message: 'sent you a connection request'
      });
    } catch (notifErr) {
      console.error('[API] Failed to send connection notification:', notifErr);
    }
  },

  async acceptConnectionRequest(requestId: string, receiverId: string): Promise<void> {
    const { data, error } = await supabase
      .from('connection_requests')
      .update({ status: 'accepted' })
      .match({ id: requestId, receiver_id: receiverId, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Connection request not found or already responded to.');

    const [userOneId, userTwoId] = [data.sender_id, data.receiver_id].sort();
    const { error: connectionError } = await supabase
      .from('connections')
      .insert({ user_one_id: userOneId, user_two_id: userTwoId });

    if (connectionError && connectionError.code !== '23505') {
      console.error('[API] Failed to insert connection record:', connectionError);
      throw connectionError;
    }

    try {
      await supabase.from('notifications').insert({
        user_id: data.sender_id,
        actor_id: receiverId,
        type: 'connect_accept',
        message: 'accepted your connection request'
      });
    } catch (notifErr) {
      console.error('[API] Failed to send connection accepted notification:', notifErr);
    }
  },

  async rejectConnectionRequest(requestId: string, receiverId: string): Promise<void> {
    const { data, error } = await supabase
      .from('connection_requests')
      .update({ status: 'rejected' })
      .match({ id: requestId, receiver_id: receiverId, status: 'pending' })
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error('Connection request not found or already responded to.');
  },

  // ==========================================
  // 5. PROFILES & STORAGE API
  // ==========================================
  normalizeProfileRow(data: Record<string, unknown>): Profile {
    const website = (data.website as string | null) || (data.website_url as string | null) || null;
    const website_url = (data.website_url as string | null) || (data.website as string | null) || null;
    const banner_url = (data.banner_url as string | null) || null;
    const banner_style = (data.banner_style as string | null) || null;
    const location = (data.location as string | null) || null;
    const skills = Array.isArray(data.skills) ? data.skills : [];
    const achievements = Array.isArray(data.achievements) ? data.achievements : [];
    const experience = Array.isArray(data.experience) ? data.experience : [];
    const college_name = (data.college_name as string | null) || null;
    const studying_year = (data.studying_year as string | null) || null;

    const products = Array.isArray(data.products) && data.products.length > 0
      ? ((data.products[0] as Record<string, unknown>).count as number) || 0
      : 0;
    const followers = Array.isArray(data.followers) && data.followers.length > 0
      ? ((data.followers[0] as Record<string, unknown>).count as number) || 0
      : 0;
    const following = Array.isArray(data.following) && data.following.length > 0
      ? ((data.following[0] as Record<string, unknown>).count as number) || 0
      : 0;
    const connections = typeof data.connections === 'number' ? data.connections : 0;

    const row = data as Record<string, unknown>;
    return {
      ...row,
      website,
      website_url,
      banner_url,
      banner_style,
      location,
      skills,
      achievements,
      experience,
      college_name,
      studying_year,
      products,
      followers,
      following,
      connections
    } as Profile;
  },

  async generateUniqueUsername(baseUsername: string): Promise<string> {
    let username = baseUsername.toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!username || username.length < 3) {
      username = `user${Math.floor(Math.random() * 90000) + 10000}`;
    }

    let attempts = 0;
    while (attempts < 5) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username)
        .limit(1);

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        return username;
      }

      username = `${username}${Math.floor(Math.random() * 900)}`;
      attempts += 1;
    }

    return `${baseUsername.slice(0, 8)}${Math.floor(Math.random() * 90000) + 10000}`;
  },

  async createProfileFromAuthUser(user: Record<string, unknown>): Promise<Profile> {
    const userId = typeof user.id === 'string' ? user.id : '';
    const email = typeof user.email === 'string' ? user.email : undefined;
    const metadata = typeof user.user_metadata === 'object' && user.user_metadata !== null ? user.user_metadata as Record<string, unknown> : {};

    console.info('[api] Creating fallback profile for authenticated user', { userId, email });

    const candidate = typeof metadata.username === 'string'
      ? metadata.username
      : email?.split('@')[0];
    const username = await this.generateUniqueUsername(candidate || `user${userId.slice(0, 8)}`);
    const full_name = typeof metadata.full_name === 'string' ? metadata.full_name : null;

    // ONLY insert fields that are guaranteed to exist in the database profiles table.
    // Omit fields like banner_url, banner_style, skills, etc., until the SQL migration is run.
    const { data, error } = await (supabase.from('profiles') as any)
      .insert({
        id: user.id,
        username,
        full_name,
        avatar_url: null,
        headline: null,
        bio: null,
        website: null,
        github_url: null,
        twitter_url: null,
        linkedin_url: null
      })
      .select()
      .single();

    if (error) {
      console.error('[api] Failed to create fallback profile:', error);
      throw error;
    }

    if (!data) {
      throw new Error('Fallback profile creation returned no data.');
    }

    return this.normalizeProfileRow(data);
  },

  async getProfile(userId: string): Promise<Profile | null> {
    console.debug('[api.getProfile] Looking up profile for userId:', userId);
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
      if (error.code === 'PGRST116') {
        console.warn('[api.getProfile] No profile row found for userId:', userId);
        return null;
      }
      throw error;
    }

    // Gracefully handle connections lookup failure in case the connections table is not yet created
    let connectionsCount = 0;
    try {
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id')
        .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`);

      if (connectionsError) {
        console.warn('[api.getProfile] Connections query database error (table might not exist yet):', connectionsError.message);
      } else if (connectionsData) {
        connectionsCount = connectionsData.length;
      }
    } catch (err) {
      console.warn('[api.getProfile] Exception during connections fetch:', err);
    }
    
    return this.normalizeProfileRow({
      ...data,
      connections: connectionsCount
    });
  },

  async getProfileByUsername(username: string): Promise<Profile | null> {
    console.debug('[api.getProfileByUsername] Looking up profile for username:', username);
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

    // Gracefully handle connections lookup failure in case the connections table is not yet created
    let connectionsCount = 0;
    try {
      const { data: connectionsData, error: connectionsError } = await supabase
        .from('connections')
        .select('id')
        .or(`user_one_id.eq.${data.id},user_two_id.eq.${data.id}`);

      if (connectionsError) {
        console.warn('[api.getProfileByUsername] Connections query database error (table might not exist yet):', connectionsError.message);
      } else if (connectionsData) {
        connectionsCount = connectionsData.length;
      }
    } catch (err) {
      console.warn('[api.getProfileByUsername] Exception during connections fetch:', err);
    }

    return this.normalizeProfileRow({
      ...data,
      connections: connectionsCount
    });
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

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      if (uploadError.status === 404) {
        throw new Error(`Storage bucket "${STORAGE_BUCKET}" was not found. Create this bucket in Supabase or set VITE_SUPABASE_STORAGE_BUCKET to an existing public bucket.`);
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

  async getUnreadMessagesCount(userId: string): Promise<number> {
    const { data: participantRows, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', userId);

    if (participantError) throw participantError;

    const conversationIds = (participantRows || []).map((row) => row.conversation_id).filter(Boolean);
    if (conversationIds.length === 0) return 0;

    const { data, error } = await supabase
      .from('messages')
      .select('id')
      .neq('sender_id', userId)
      .eq('is_read', false)
      .in('conversation_id', conversationIds);

    if (error) throw error;
    return (data || []).length;
  },

  async getConversationsForUser(userId: string): Promise<Conversation[]> {
    try {
      // 1. Fetch conversation_ids from conversation_participants for current user
      const { data: partRows, error: partError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (partError) {
        console.error('[getConversationsForUser] Error fetching user participants:', partError);
        throw partError;
      }
      const conversationIds = (partRows || []).map((r) => r.conversation_id).filter(Boolean);
      if (conversationIds.length === 0) return [];

      // 2. Fetch conversations, participants, unread counts, and latest messages sequentially to avoid recursive RLS / subquery limits
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, conversation_type, created_at')
        .in('id', conversationIds);

      if (conversationsError) {
        console.error('[getConversationsForUser] Error fetching conversations:', conversationsError);
        throw conversationsError;
      }

      // Fetch participants for these conversations
      const { data: allParticipantsData, error: allParticipantsError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds);

      if (allParticipantsError) {
        console.error('[getConversationsForUser] Error fetching participants list:', allParticipantsError);
        throw allParticipantsError;
      }

      // Fetch profiles of all unique participants
      const distinctUserIds = [...new Set((allParticipantsData || []).map((p) => p.user_id))];
      let profilesMap: Record<string, Profile> = {};

      if (distinctUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', distinctUserIds);

        if (profilesError) {
          console.error('[getConversationsForUser] Error fetching participant profiles:', profilesError);
          throw profilesError;
        }

        profilesMap = (profilesData || []).reduce<Record<string, Profile>>((acc, row) => {
          acc[row.id] = api.normalizeProfileRow(row);
          return acc;
        }, {});
      }

      // Group participants by conversation_id
      const participantsByConversation: Record<string, Profile[]> = {};
      (allParticipantsData || []).forEach((p) => {
        const profile = profilesMap[p.user_id];
        if (profile) {
          if (!participantsByConversation[p.conversation_id]) {
            participantsByConversation[p.conversation_id] = [];
          }
          participantsByConversation[p.conversation_id].push(profile);
        }
      });

      // Fetch unread message counts for each conversation
      const { data: unreadData, error: unreadError } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', conversationIds)
        .eq('is_read', false)
        .neq('sender_id', userId);

      if (unreadError) {
        console.error('[getConversationsForUser] Error fetching unread counts:', unreadError);
        throw unreadError;
      }

      const unreadCountMap: Record<string, number> = {};
      (unreadData || []).forEach((row) => {
        unreadCountMap[row.conversation_id] = (unreadCountMap[row.conversation_id] || 0) + 1;
      });

      // Fetch latest messages for each conversation
      const lastMessagesList = await Promise.all(
        conversationIds.map(async (cid) => {
          try {
            const { data, error } = await supabase
              .from('messages')
              .select('content, created_at, sender_id, is_read')
              .eq('conversation_id', cid)
              .order('created_at', { ascending: false })
              .limit(1);

            if (error) {
              console.error(`[getConversationsForUser] Error fetching latest message for ${cid}:`, error);
              return { conversation_id: cid, lastMessage: null };
            }
            return { conversation_id: cid, lastMessage: data?.[0] || null };
          } catch (lastMsgErr) {
            console.error(`[getConversationsForUser] Exception fetching latest message for ${cid}:`, lastMsgErr);
            return { conversation_id: cid, lastMessage: null };
          }
        })
      );

      const lastMessageMap: Record<string, any> = {};
      lastMessagesList.forEach((item) => {
        if (item.lastMessage) {
          lastMessageMap[item.conversation_id] = item.lastMessage;
        }
      });

      const conversations = (conversationsData || []).map((conversation: any) => {
        const participants = participantsByConversation[conversation.id] || [];
        const conversationType = (conversation.conversation_type as 'private' | 'group') || 'private';
        let partner: Profile;

        if (conversationType === 'group') {
          partner = {
            id: 'group',
            username: `Group (${participants.length} members)`,
            full_name: `Group Chat (${participants.length} members)`,
            avatar_url: null,
            headline: `Group conversation with ${participants.length} members`,
            bio: null,
            github_url: null,
            twitter_url: null,
            linkedin_url: null
          };
        } else {
          partner = participants.find((p) => p.id !== userId) || participants[0] || {
            id: 'unknown',
            username: 'unknown',
            full_name: 'Unknown User',
            avatar_url: null,
            headline: null,
            bio: null,
            github_url: null,
            twitter_url: null,
            linkedin_url: null
          };
        }

        const lastMessage = lastMessageMap[conversation.id];

        return {
          id: conversation.id,
          created_at: conversation.created_at,
          conversation_type: conversationType,
          participants,
          partner,
          last_message: lastMessage ? lastMessage.content : undefined,
          last_message_at: lastMessage ? lastMessage.created_at : undefined,
          unread_count: unreadCountMap[conversation.id] || 0
        } as Conversation;
      });

      return conversations.sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : new Date(a.created_at).getTime();
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : new Date(b.created_at).getTime();
        return bTime - aTime;
      });
    } catch (err) {
      console.error('[api.getConversationsForUser] Exception fetching conversations:', err);
      return [];
    }
  },

  async getConversation(conversationId: string, userId: string): Promise<Conversation | null> {
    try {
      // 1. Fetch conversation row
      const { data: conversationData, error: conversationError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (conversationError) {
        if (conversationError.code === 'PGRST116') {
          console.warn(`[getConversation] Conversation not found: ${conversationId}`);
          return null;
        }
        console.error('[getConversation] Supabase error loading conversation:', conversationError);
        throw conversationError;
      }

      // 2. Fetch conversation participants
      const { data: participantsRows, error: participantsError } = await supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('conversation_id', conversationId);

      if (participantsError) {
        console.error('[getConversation] Supabase error loading participants:', participantsError);
        throw participantsError;
      }

      const participantUserIds = (participantsRows || []).map((r) => r.user_id);
      let participants: Profile[] = [];

      if (participantUserIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', participantUserIds);

        if (profilesError) {
          console.error('[getConversation] Supabase error loading profiles for participants:', profilesError);
          throw profilesError;
        }
        participants = (profilesData || []).map((p) => api.normalizeProfileRow(p));
      }

      // 3. Fetch messages for the conversation
      const { data: messagesRows, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('[getConversation] Supabase error loading messages:', messagesError);
        throw messagesError;
      }

      // Fetch profiles for the senders of these messages
      const senderIds = [...new Set((messagesRows || []).map((m) => m.sender_id))];
      let sendersMap: Record<string, Profile> = {};

      if (senderIds.length > 0) {
        const { data: sendersData, error: sendersError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', senderIds);

        if (sendersError) {
          console.error('[getConversation] Supabase error loading message senders profiles:', sendersError);
          throw sendersError;
        }

        sendersMap = (sendersData || []).reduce<Record<string, Profile>>((acc, row) => {
          acc[row.id] = api.normalizeProfileRow(row);
          return acc;
        }, {});
      }

      const messages: Message[] = (messagesRows || []).map((m: any) => ({
        ...m,
        sender: sendersMap[m.sender_id]
      }));

      const conversationType = (conversationData.conversation_type as 'private' | 'group') || 'private';
      let partner: Profile;

      if (conversationType === 'group') {
        partner = {
          id: 'group',
          username: `Group (${participants.length} members)`,
          full_name: `Group Chat (${participants.length} members)`,
          avatar_url: null,
          headline: `Group conversation with ${participants.length} members`,
          bio: null,
          github_url: null,
          twitter_url: null,
          linkedin_url: null
        };
      } else {
        partner = participants.find((p) => p.id !== userId) || participants[0] || {
          id: 'unknown',
          username: 'unknown',
          full_name: 'Unknown User',
          avatar_url: null,
          headline: null,
          bio: null,
          github_url: null,
          twitter_url: null,
          linkedin_url: null
        };
      }

      return {
        id: conversationData.id,
        created_at: conversationData.created_at,
        conversation_type: conversationType,
        participants,
        partner,
        messages,
        unread_count: messages.filter((message) => !message.is_read && message.sender_id !== userId).length,
        last_message: messages.length > 0 ? messages[messages.length - 1].content : undefined,
        last_message_at: messages.length > 0 ? messages[messages.length - 1].created_at : undefined,
      } as Conversation;
    } catch (err) {
      console.error('[api.getConversation] Exception fetching conversation detail:', err);
      throw err;
    }
  },

  async openConversation(userId: string, otherUserId: string): Promise<Conversation> {
    if (userId === otherUserId) {
      throw new Error('You cannot open a conversation with yourself.');
    }

    try {
      // 1. Fetch conversations of type 'private' where the current user is a participant
      const { data: myPartRows, error: myPartError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', userId);

      if (myPartError) {
        console.error('[openConversation] Error searching my conversation participants:', myPartError);
        throw myPartError;
      }

      const myConvIds = (myPartRows || []).map((r) => r.conversation_id).filter(Boolean);
      let existingConvId: string | null = null;

      if (myConvIds.length > 0) {
        // Fetch all participants for these conversations
        const { data: allParts, error: allPartsError } = await supabase
          .from('conversation_participants')
          .select('conversation_id, user_id')
          .in('conversation_id', myConvIds);

        if (allPartsError) {
          console.error('[openConversation] Error fetching all conversation participants:', allPartsError);
          throw allPartsError;
        }

        // Group participants by conversation_id
        const partsByConv: Record<string, string[]> = {};
        (allParts || []).forEach((p) => {
          if (!partsByConv[p.conversation_id]) {
            partsByConv[p.conversation_id] = [];
          }
          partsByConv[p.conversation_id].push(p.user_id);
        });

        // Get conversations details to filter only private conversations
        const { data: convTypes, error: convTypesError } = await supabase
          .from('conversations')
          .select('id, conversation_type')
          .in('id', myConvIds);

        if (convTypesError) {
          console.error('[openConversation] Error fetching conversation types:', convTypesError);
          throw convTypesError;
        }

        const privateConvs = (convTypes || [])
          .filter((c) => c.conversation_type === 'private')
          .map((c) => c.id);

        const matchedConv = privateConvs.find((cid) => {
          const uids = partsByConv[cid] || [];
          return uids.length === 2 && uids.includes(userId) && uids.includes(otherUserId);
        });

        if (matchedConv) {
          existingConvId = matchedConv;
        }
      }

      if (existingConvId) {
        const conversation = await this.getConversation(existingConvId, userId);
        if (!conversation) throw new Error('Unable to load conversation.');
        return conversation;
      }

      // Create new private 1-to-1 conversation
      const newConversationId = typeof window !== 'undefined' && window.crypto?.randomUUID 
        ? window.crypto.randomUUID() 
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = (Math.random() * 16) | 0;
            const v = c === 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });

      const { error: conversationError } = await supabase
        .from('conversations')
        .insert({
          id: newConversationId,
          created_by: userId,
          conversation_type: 'private'
        });

      if (conversationError) {
        console.error('[openConversation] Error inserting conversations row:', conversationError);
        throw conversationError;
      }

      const { error: creatorPartError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConversationId, user_id: userId });

      if (creatorPartError) {
        console.error('[openConversation] Error inserting creator participant row:', creatorPartError);
        throw creatorPartError;
      }

      const { error: partnerPartError } = await supabase
        .from('conversation_participants')
        .insert({ conversation_id: newConversationId, user_id: otherUserId });

      if (partnerPartError) {
        console.error('[openConversation] Error inserting partner participant row:', partnerPartError);
        throw partnerPartError;
      }

      const conversation = await this.getConversation(newConversationId, userId);
      if (!conversation) throw new Error('Unable to load newly created conversation.');
      return conversation;
    } catch (err) {
      console.error('[api.openConversation] Exception opening conversation:', err);
      throw err;
    }
  },

  async sendMessage(conversationId: string, senderId: string, content: string, recipientId?: string): Promise<Message> {
    const trimmed = content.trim();
    if (!trimmed) {
      throw new Error('Message content cannot be empty.');
    }

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('User not authenticated.');
      }

      const sender_id = user.id;
      const conversation_id = conversationId;

      let finalRecipientId = recipientId;
      let recipientsList = recipientId ? [recipientId] : [];

      if (!finalRecipientId) {
        const { data: participantRows, error: participantError } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId);

        if (participantError) {
          console.error('[sendMessage] Failed to load conversation participants for message recipient:', participantError);
          throw participantError;
        }

        finalRecipientId = (participantRows || [])
          .map((row) => row.user_id)
          .find((userId) => userId !== sender_id);

        recipientsList = (participantRows || [])
          .map((row) => row.user_id)
          .filter((userId) => userId !== sender_id);
      }

      const recipient_id = finalRecipientId;

      console.log("Current User:", user?.id);
      console.log("Sender ID:", sender_id);
      console.log("Conversation ID:", conversation_id);

      // Insert message flat row
      const { data: insertedMsg, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id,
          sender_id: user.id,
          recipient_id,
          content: trimmed
        })
        .select('*')
        .single();

      if (insertError) {
        console.error('[sendMessage] Error inserting message row:', insertError);
        throw insertError;
      }

      // Fetch sender profile flat row
      const { data: senderProfileRow, error: senderProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sender_id)
        .single();

      if (senderProfileError) {
        console.warn('[sendMessage] Failed to fetch sender profile for returned message:', senderProfileError);
      }

      const senderProfile = senderProfileRow ? api.normalizeProfileRow(senderProfileRow) : undefined;
      const message: Message = {
        ...insertedMsg,
        sender: senderProfile
      };

      // Create notifications for recipients in background
      if (recipientsList.length > 0) {
        try {
          await supabase.from('notifications').insert(
            recipientsList.map((rId) => ({
              user_id: rId,
              actor_id: sender_id,
              conversation_id: conversationId,
              type: 'message',
              message: 'sent you a message'
            }))
          );
        } catch (notificationError) {
          console.error('[sendMessage] Failed to create message notifications:', notificationError);
        }
      }

      return message;
    } catch (err) {
      console.error('[api.sendMessage] Exception sending message:', err);
      throw err;
    }
  },


  async markConversationMessagesRead(conversationId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false);

    if (error) throw error;

    // Synchronously clear notifications of type 'message' for this conversation
    try {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .eq('type', 'message')
        .eq('read', false);
    } catch (notificationError) {
      console.error('[API] Failed to mark message notifications as read:', notificationError);
    }
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
    callback: (payload: any) => void,
    filter?: string
  ): () => void {
    try {
      // Append a unique random suffix to prevent channel collisions in rapid page mounts/unmounts or multiple tabs
      const uniqueChannelName = `${channelName}-${Math.random().toString(36).substring(2, 11)}`;

      const subscription = supabase
        .channel(uniqueChannelName)
        .on(
          'postgres_changes',
          {
            event,
            schema: 'public',
            table: tableName,
            filter
          },
          (payload) => {
            callback(payload);
          }
        )
        .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
            console.info(`[Realtime] Successfully subscribed to ${tableName} updates on channel: ${uniqueChannelName}`);
          } else if (status === 'CLOSED') {
            console.info(`[Realtime] Subscription closed for ${tableName} on channel: ${uniqueChannelName}`);
          } else if (status === 'CHANNEL_ERROR') {
            console.error(`[Realtime] Channel error subscribing to ${tableName} on channel ${uniqueChannelName}:`, err);
          } else if (status === 'TIMED_OUT') {
            console.warn(`[Realtime] Subscription timed out subscribing to ${tableName} on channel ${uniqueChannelName}`);
          }
        });

      return () => {
        try {
          supabase.removeChannel(subscription);
        } catch (removeErr) {
          console.warn('[api.subscribeToChanges] Failed to remove channel:', removeErr);
        }
      };
    } catch (err) {
      console.error('[api.subscribeToChanges] Realtime subscription failed to initialize:', err);
      return () => {};
    }
  }
};
