import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { MessageCircle, Reply, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface CommentUser {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

interface Comment {
  id: string;
  eventId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  user: CommentUser;
  replies?: Comment[];
}

interface EventCommentsProps {
  eventId: string;
  currentUserId?: string;
}

export function EventComments({ eventId, currentUserId }: EventCommentsProps) {
  const [showReplyForm, setShowReplyForm] = useState<string | null>(null);
  const [showMainForm, setShowMainForm] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["/api/events", eventId, "comments"],
    queryFn: () => fetch(`/api/events/${eventId}/comments`).then(res => res.json()) as Promise<Comment[]>
  });

  const createCommentMutation = useMutation({
    mutationFn: ({ content, parentCommentId }: { content: string; parentCommentId?: string }) =>
      apiRequest("POST", `/api/events/${eventId}/comments`, { content, parentCommentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "comments"] });
      setNewComment("");
      setReplyContent("");
      setShowMainForm(false);
      setShowReplyForm(null);
      toast({ title: "Comment posted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to post comment", variant: "destructive" });
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      apiRequest("DELETE", `/api/comments/${commentId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/events", eventId, "comments"] });
      toast({ title: "Comment deleted successfully!" });
    },
    onError: () => {
      toast({ title: "Failed to delete comment", variant: "destructive" });
    },
  });

  const handleSubmitComment = () => {
    if (!newComment.trim()) return;
    createCommentMutation.mutate({ content: newComment });
  };

  const handleSubmitReply = (parentCommentId: string) => {
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({ content: replyContent, parentCommentId });
  };

  const handleDeleteComment = (commentId: string) => {
    if (confirm("Are you sure you want to delete this comment?")) {
      deleteCommentMutation.mutate(commentId);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          Comments ({comments.length})
        </h3>
        {currentUserId && (
          <Button
            onClick={() => setShowMainForm(!showMainForm)}
            variant="outline"
            size="sm"
            data-testid="button-add-comment"
          >
            Add Comment
          </Button>
        )}
      </div>

      {showMainForm && currentUserId && (
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg space-y-3">
          <Textarea
            placeholder="Share your thoughts about this event..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="min-h-[80px]"
            maxLength={1000}
            data-testid="input-new-comment"
          />
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">
              {newComment.length}/1000 characters
            </span>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowMainForm(false);
                  setNewComment("");
                }}
                variant="outline"
                size="sm"
                data-testid="button-cancel-comment"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || createCommentMutation.isPending}
                size="sm"
                data-testid="button-submit-comment"
              >
                <Send className="h-4 w-4 mr-1" />
                {createCommentMutation.isPending ? "Posting..." : "Post"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No comments yet. Be the first to share your thoughts!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="space-y-3">
              {/* Main Comment */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={comment.user.avatarUrl || undefined} />
                    <AvatarFallback>
                      {comment.user.displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-sm" data-testid={`text-comment-author-${comment.id}`}>
                          {comment.user.displayName}
                        </span>
                        <span className="text-xs text-gray-500" data-testid={`text-comment-time-${comment.id}`}>
                          {format(new Date(comment.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                      </div>
                      {currentUserId === comment.userId && (
                        <Button
                          onClick={() => handleDeleteComment(comment.id)}
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          data-testid={`button-delete-comment-${comment.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm" data-testid={`text-comment-content-${comment.id}`}>
                      {comment.content}
                    </p>
                    {currentUserId && (
                      <Button
                        onClick={() => setShowReplyForm(showReplyForm === comment.id ? null : comment.id)}
                        variant="ghost"
                        size="sm"
                        className="text-blue-600 hover:text-blue-800"
                        data-testid={`button-reply-${comment.id}`}
                      >
                        <Reply className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Reply Form */}
              {showReplyForm === comment.id && (
                <div className="ml-8 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-3">
                  <Textarea
                    placeholder="Write a reply..."
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="min-h-[60px]"
                    maxLength={1000}
                    data-testid={`input-reply-${comment.id}`}
                  />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      {replyContent.length}/1000 characters
                    </span>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setShowReplyForm(null);
                          setReplyContent("");
                        }}
                        variant="outline"
                        size="sm"
                        data-testid={`button-cancel-reply-${comment.id}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => handleSubmitReply(comment.id)}
                        disabled={!replyContent.trim() || createCommentMutation.isPending}
                        size="sm"
                        data-testid={`button-submit-reply-${comment.id}`}
                      >
                        <Send className="h-4 w-4 mr-1" />
                        {createCommentMutation.isPending ? "Posting..." : "Reply"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Replies */}
              {comment.replies && comment.replies.length > 0 && (
                <div className="ml-8 space-y-3">
                  {comment.replies.map((reply) => (
                    <div
                      key={reply.id}
                      className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-600"
                    >
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={reply.user.avatarUrl || undefined} />
                          <AvatarFallback className="text-xs">
                            {reply.user.displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-medium text-sm" data-testid={`text-reply-author-${reply.id}`}>
                                {reply.user.displayName}
                              </span>
                              <span className="text-xs text-gray-500" data-testid={`text-reply-time-${reply.id}`}>
                                {format(new Date(reply.createdAt), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                            </div>
                            {currentUserId === reply.userId && (
                              <Button
                                onClick={() => handleDeleteComment(reply.id)}
                                variant="ghost"
                                size="sm"
                                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                data-testid={`button-delete-reply-${reply.id}`}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-sm" data-testid={`text-reply-content-${reply.id}`}>
                            {reply.content}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}