import React, { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useAuth } from "../context/AuthContext";
import {
  getBlogs,
  getBlogById,
  createBlog,
  updateBlog,
  deleteBlog,
  toggleLike,
  getComments,
  addComment,
} from "../api/blogApi";
import {
  ScreenContainer,
  AppHeader,
  AppText,
  SectionHeader,
  PrimaryButton,
  SecondaryButton,
  TextField,
  SearchField,
  EmptyState,
  FilterChips,
  formatDate,
  useToast,
  useConfirm,
  useTheme,
} from "../ui";
import { Stack, ResourceState, EditorialImage } from "./shared";
import { useResource } from "./useResource";
import { errorMessage } from "./api";
import { Upload, appendImage } from "./Upload";
export function BlogPreview({ blog }: { blog: any }) {
  const t = useTheme();
  return (
    <View
      style={{
        gap: 12,
        paddingVertical: 24,
        borderBottomWidth: 1,
        borderColor: t.colors.border,
      }}
    >
      {blog.coverImage ? (
        <EditorialImage uri={blog.coverImage} label={blog.title} height={180} />
      ) : null}
      <AppText variant="caption" color="textMuted">
        {blog.penName || blog.author} · {formatDate(blog.createdAt)}
      </AppText>
      <AppText variant="sectionTitle">{blog.title}</AppText>
      <AppText color="textSecondary" numberOfLines={3}>
        {blog.content}
      </AppText>
      <SecondaryButton
        title="Read story"
        iconRight="arrow-forward"
        onPress={() =>
          router.push({ pathname: "/blog/view", params: { id: blog._id } })
        }
      />
    </View>
  );
}
export default function Community({ mine = false }: { mine?: boolean }) {
  const { user } = useAuth();
  const [filter, setFilter] = useState(mine ? "mine" : "all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const resource = useResource<any[]>(
    "community",
    async () => (await getBlogs()).data,
  );
  const items = (resource.data || []).filter(
    (b) =>
      (filter !== "mine" || b.authorId === user?._id) &&
      `${b.title} ${b.author} ${b.penName || ""}`
        .toLowerCase()
        .includes(q.toLowerCase()),
  );
  return (
    <ScreenContainer
      width="reading"
      onRefresh={resource.refresh}
      refreshing={resource.loading && !!resource.data}
    >
      <Stack>
        <AppHeader
          title="Between the pages"
          subtitle="A place for readers to share what stays with them."
        />
        <PrimaryButton
          title="Write a story"
          icon="create-outline"
          onPress={() => router.push("/blog/create")}
        />
        <FilterChips
          label="Community posts"
          value={filter}
          onChange={(v) => {
            setFilter(v || "all");
            setPage(1);
          }}
          options={[
            { value: "all", label: "All stories" },
            { value: "mine", label: "My stories" },
          ]}
        />
        <SearchField
          label="Search stories"
          value={q}
          onChangeText={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search titles or writers"
        />
        <ResourceState resource={resource} />
        {items.slice((page - 1) * 12, page * 12).map((b) => (
          <BlogPreview key={b._id} blog={b} />
        ))}
        {!resource.loading && !resource.error && items.length === 0 ? (
          <EmptyState
            title="There’s a story waiting to be told"
            message="Write a post, or try a different search."
            action={{
              label: "Write a story",
              onPress: () => router.push("/blog/create"),
            }}
          />
        ) : null}
        {items.length > 12 ? (
          <>
            <AppText>
              Page {page} of {Math.ceil(items.length / 12)}
            </AppText>
            <SecondaryButton
              title="Previous stories"
              disabled={page === 1}
              onPress={() => setPage((p) => p - 1)}
            />
            <SecondaryButton
              title="Next stories"
              disabled={page * 12 >= items.length}
              onPress={() => setPage((p) => p + 1)}
            />
          </>
        ) : null}
      </Stack>
    </ScreenContainer>
  );
}
export function BlogDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const post = useResource<any>(
    `blog:${id}`,
    async () => (await getBlogById(id)).data,
  );
  const comments = useResource<any[]>(
    `comments:${id}`,
    async () => (await getComments(id)).data,
  );
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [liking, setLiking] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const b = post.data;
  const own = b?.authorId === user?._id;
  const like = async () => {
    setLiking(true);
    try {
      await toggleLike(id);
      await post.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setLiking(false);
    }
  };
  const commentOn = async () => {
    setSubmitted(true);
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await addComment(id, comment.trim());
      setComment("");
      setSubmitted(false);
      await comments.refresh();
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (
      !(await confirm({
        title: "Delete this story?",
        message:
          "Its comments and likes will also be removed. This cannot be undone.",
        confirmLabel: "Delete story",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      await deleteBlog(id);
      router.replace("/(tabs)/blogs");
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer width="reading" keyboardAvoiding>
      <Stack>
        <AppHeader
          title="The reading room"
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)/blogs")
          }
        />
        <ResourceState resource={post} />
        {b ? (
          <>
            <AppText variant="display">{b.title}</AppText>
            <AppText color="textSecondary">
              {b.penName || b.author} · {formatDate(b.createdAt)}
            </AppText>
            {b.coverImage ? (
              <EditorialImage uri={b.coverImage} label={b.title} height={280} />
            ) : null}
            <AppText style={{ lineHeight: 30 }}>{b.content}</AppText>
            <SecondaryButton
              title={`${b.likes?.includes(user?._id) ? "Unlike" : "Like"} · ${b.likes?.length || 0}`}
              icon="heart-outline"
              onPress={like}
              loading={liking}
            />
            {own ? (
              <>
                <SecondaryButton
                  title="Edit story"
                  icon="create-outline"
                  onPress={() =>
                    router.push({ pathname: "/blog/edit", params: { id } })
                  }
                />
                <SecondaryButton
                  title="Delete story"
                  onPress={remove}
                  loading={busy}
                />
              </>
            ) : null}
            <SectionHeader title="Conversation" />
            <ResourceState resource={comments} />
            {comments.data?.map((c) => (
              <Stack key={c._id} gap={8}>
                <AppText variant="label">
                  {c.userName} · {formatDate(c.createdAt)}
                </AppText>
                <AppText>{c.text}</AppText>
              </Stack>
            ))}
            {comments.data?.length === 0 ? (
              <AppText color="textSecondary">
                No comments yet. Start the conversation.
              </AppText>
            ) : null}
            <TextField
              label="Your comment"
              required
              multiline
              maxLength={1000}
              value={comment}
              onChangeText={setComment}
              error={
                submitted && !comment.trim()
                  ? "Write a comment first."
                  : undefined
              }
            />
            <PrimaryButton
              title="Post comment"
              onPress={commentOn}
              loading={busy}
            />
          </>
        ) : null}
      </Stack>
    </ScreenContainer>
  );
}
export function BlogEditor({ editing = false }: { editing?: boolean }) {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [penName, setPenName] = useState("");
  const [image, setImage] = useState<any>(null);
  const [existing, setExisting] = useState<string | undefined>();
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [removeCover, setRemoveCover] = useState(false);
  const post = useResource<any>(`edit:${editing}:${id}`, async () => {
    if (!editing) return {};
    const b = (await getBlogById(id)).data;
    return b;
  });
  const [loadedId, setLoadedId] = useState<string>();
  React.useEffect(() => {
    const b = post.data;
    if (editing && b?._id && loadedId !== b._id) {
      setTitle(b.title);
      setContent(b.content);
      setPenName(b.penName || "");
      setExisting(b.coverImage);
      setLoadedId(b._id);
    }
  }, [post.data, editing, loadedId]);
  const dirty =
    title !== (post.data?.title || "") ||
    content !== (post.data?.content || "") ||
    penName !== (post.data?.penName || "") ||
    !!image ||
    removeCover;
  const back = async () => {
    if (
      !dirty ||
      (await confirm({
        title: "Discard your draft?",
        message: "Unsaved changes will be lost.",
        confirmLabel: "Discard draft",
        tone: "danger",
      }))
    )
      router.back();
  };
  const save = async () => {
    setSubmitted(true);
    if (!title.trim() || !content.trim() || busy) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append("title", title.trim());
      form.append("content", content.trim());
      form.append("penName", penName.trim());
      if (removeCover) form.append("removeCoverImage", "true");
      if (image) await appendImage(form, "coverImage", image);
      const result = editing
        ? await updateBlog(id, form)
        : await createBlog(form);
      toast.success(editing ? "Story updated." : "Story published.");
      router.replace({
        pathname: "/blog/view",
        params: { id: result.data._id },
      });
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ScreenContainer width="reading" keyboardAvoiding>
      <Stack>
        <AppHeader
          title={editing ? "Edit your story" : "A story worth sharing"}
          onBack={back}
        />
        {editing ? <ResourceState resource={post} /> : null}
        {!editing || (post.data && post.data.authorId === user?._id) ? (
          <>
            <TextField
              label="Story title"
              required
              maxLength={200}
              value={title}
              onChangeText={setTitle}
              error={
                submitted && !title.trim()
                  ? "Give your story a title."
                  : undefined
              }
            />
            <TextField
              label="Pen name"
              maxLength={80}
              value={penName}
              onChangeText={setPenName}
              helperText="Optional. Leave empty to use your profile name."
            />
            <TextField
              label="Your story"
              required
              multiline
              maxLength={20000}
              value={content}
              onChangeText={setContent}
              numberOfLines={12}
              error={
                submitted && !content.trim()
                  ? "Write your story before publishing."
                  : undefined
              }
              helperText={`${content.length}/20000 characters`}
            />
            {existing && !image ? (
              <>
                <EditorialImage uri={existing} label="Current story cover" />
                <SecondaryButton
                  title="Remove current cover"
                  onPress={() => {
                    setExisting(undefined);
                    setRemoveCover(true);
                  }}
                />
              </>
            ) : null}
            <Upload
              label="Choose story cover"
              value={image}
              onChange={setImage}
            />
            <PrimaryButton
              title={editing ? "Save story" : "Publish story"}
              onPress={save}
              loading={busy}
              disabled={editing && (!post.data || !!post.error)}
            />
            <SecondaryButton title="Cancel" onPress={back} disabled={busy} />
          </>
        ) : post.data ? (
          <EmptyState
            title="This story belongs to another writer"
            message="You can only edit your own stories."
          />
        ) : null}
      </Stack>
    </ScreenContainer>
  );
}
