const db = require('../config/database');

class Feed {
    static async getFeed(userId, limit = 20, offset = 0) {
        const query = `
            SELECT 
                m.MediaId, m.CampId, m.MediaType, m.MediaUrl, m.ThumbnailUrl, 
                m.Caption, m.UploadedDate,
                c.CampName, p.ProjectName, p.OrganizationId,
                u.FullName as UploadedByName,
                (SELECT COUNT(*) FROM camp_media_likes l WHERE l.MediaId = m.MediaId) as LikeCount,
                EXISTS(SELECT 1 FROM camp_media_likes l WHERE l.MediaId = m.MediaId AND l.UserId = ?) as IsLiked,
                (SELECT COUNT(*) FROM camp_media_comments cmt WHERE cmt.MediaId = m.MediaId AND cmt.IsDeleted = FALSE) as CommentCount
            FROM camp_media m
            JOIN camps c ON m.CampId = c.CampId
            JOIN projects p ON c.ProjectId = p.ProjectId
            LEFT JOIN users u ON m.UploadedBy = u.UserId
            WHERE m.IsDeleted = FALSE AND c.IsDeleted = FALSE AND p.IsDeleted = FALSE
            ORDER BY m.UploadedDate DESC
            LIMIT ? OFFSET ?
        `;
        const [rows] = await db.execute(query, [userId, parseInt(limit), parseInt(offset)]);

        return rows.map(row => ({
            ...row,
            IsLiked: Boolean(row.IsLiked)
        }));
    }

    static async toggleLike(mediaId, userId) {
        const [existing] = await db.execute(
            'SELECT LikeId FROM camp_media_likes WHERE MediaId = ? AND UserId = ?',
            [mediaId, userId]
        );

        if (existing.length > 0) {
            await db.execute('DELETE FROM camp_media_likes WHERE LikeId = ?', [existing[0].LikeId]);
            return { liked: false };
        } else {
            await db.execute(
                'INSERT INTO camp_media_likes (MediaId, UserId) VALUES (?, ?)',
                [mediaId, userId]
            );
            return { liked: true };
        }
    }

    static async getComments(mediaId, limit = 50, offset = 0) {
        const [rows] = await db.execute(`
            SELECT cmt.CommentId, cmt.CommentText, cmt.CreatedAt, u.FullName as UserName, u.UserId
            FROM camp_media_comments cmt
            JOIN users u ON cmt.UserId = u.UserId
            WHERE cmt.MediaId = ? AND cmt.IsDeleted = FALSE
            ORDER BY cmt.CreatedAt DESC
            LIMIT ? OFFSET ?
        `, [mediaId, parseInt(limit), parseInt(offset)]);
        return rows;
    }

    static async addComment(mediaId, userId, commentText) {
        const [result] = await db.execute(
            'INSERT INTO camp_media_comments (MediaId, UserId, CommentText) VALUES (?, ?, ?)',
            [mediaId, userId, commentText]
        );
        return result.insertId;
    }

    static async deleteComment(commentId, userId, roleCode) {
        let query = 'UPDATE camp_media_comments SET IsDeleted = TRUE WHERE CommentId = ?';
        let params = [commentId];

        if (roleCode !== 'SUPER_ADMIN' && roleCode !== 'ADMIN') {
            query += ' AND UserId = ?';
            params.push(userId);
        }

        const [result] = await db.execute(query, params);
        return result.affectedRows > 0;
    }
}

module.exports = Feed;
